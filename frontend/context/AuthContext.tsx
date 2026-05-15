import { API_BASE_URL } from "@/constants/api";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { saveItem, getItem, deleteItem } from "@/lib/storage";
import { UserRole } from "@/types/roles";
import { registerForPushNotifications } from "@/lib/notifications";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: "Pending" | "Active";
  mobile?: string;
  mobileVerified?: boolean;
  abn?: string;
  businessName?: string;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (accessToken: string, refreshToken: string, user: AuthUser) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (patch: Partial<AuthUser>) => Promise<void>;
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Keep a ref so fetchWithAuth always sees the latest token without stale closure issues
  const accessTokenRef = useRef<string | null>(null);
  accessTokenRef.current = accessToken;

  // Deduplicate concurrent refresh calls — prevents refresh token reuse detection on iOS cold start
  const refreshPromiseRef = useRef<Promise<string | null> | null>(null);

  // Restore session from storage on app start, then refresh user from server
  useEffect(() => {
    async function loadSession() {
      try {
        const storedToken = await getItem("accessToken");
        const storedUser = await getItem("user");
        if (storedToken && storedUser) {
          accessTokenRef.current = storedToken;
          setAccessToken(storedToken);
          setUser(JSON.parse(storedUser));

          // Fetch fresh user data so fields like mobileVerified are never stale
          try {
            const res = await fetch(`${API_BASE_URL}/auth/me`, {
              headers: { Authorization: `Bearer ${storedToken}` },
            });
            if (res.ok) {
              const data = await res.json();
              if (data.user) {
                setUser(data.user);
                await saveItem("user", JSON.stringify(data.user));
              }
            }
          } catch {
            // Network unavailable — use cached user, no action needed
          }
        }
      } catch {
        // Corrupted storage. Start fresh
      } finally {
        setIsLoading(false);
      }
    }
    loadSession();
  }, []);

  async function login(newAccessToken: string, refreshToken: string, newUser: AuthUser) {
    await saveItem("accessToken", newAccessToken);
    await saveItem("refreshToken", refreshToken);
    await saveItem("user", JSON.stringify(newUser));
    accessTokenRef.current = newAccessToken;
    setAccessToken(newAccessToken);
    setUser(newUser);

    // Register device for push notifications — failure must not block login
    registerForPushNotifications(fetchWithAuth).catch((err) => {
      console.error("Failed to register for push notifications:", err);
    });
  }

  async function updateUser(patch: Partial<AuthUser>) {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...patch };
      saveItem("user", JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }

  async function logout() {
    // Best-effort — clear the push token on the backend before revoking local tokens
    fetchWithAuth(`${API_BASE_URL}/auth/logout`, { method: "POST" }).catch(() => {});

    await deleteItem("accessToken");
    await deleteItem("refreshToken");
    await deleteItem("user");
    setAccessToken(null);
    setUser(null);
  }

  async function refreshAccessToken(): Promise<string | null> {
    if (refreshPromiseRef.current) return refreshPromiseRef.current;

    refreshPromiseRef.current = (async () => {
      try {
        const storedRefreshToken = await getItem("refreshToken");
        if (!storedRefreshToken) return null;

        const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: storedRefreshToken }),
        });

        if (!res.ok) {
          await logout();
          return null;
        }

        const data = await res.json();
        await saveItem("accessToken", data.accessToken);
        await saveItem("refreshToken", data.refreshToken);
        setAccessToken(data.accessToken);
        if (data.user) {
          setUser(data.user);
          await saveItem("user", JSON.stringify(data.user));
        }
        return data.accessToken;
      } catch {
        await logout();
        return null;
      } finally {
        refreshPromiseRef.current = null;
      }
    })();

    return refreshPromiseRef.current;
  }

  async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    const token = accessTokenRef.current;
    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const res = await fetch(url, { ...options, headers });

    if (res.status === 401) {
      const newToken = await refreshAccessToken();
      if (!newToken) return res;

      const retryHeaders = { ...headers, Authorization: `Bearer ${newToken}` };
      return fetch(url, { ...options, headers: retryHeaders });
    }

    return res;
  }

  return (
    <AuthContext.Provider
      value={{ user, accessToken, isLoading, login, logout, updateUser, fetchWithAuth }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
