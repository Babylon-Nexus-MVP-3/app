import { API_BASE_URL } from "@/constants/api";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { saveItem, getItem, deleteItem } from "@/lib/storage";
import { UserRole } from "../../backend/src/models/userModel";
import { registerForPushNotifications } from "@/lib/notifications";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: "Pending" | "Active";
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (accessToken: string, refreshToken: string, user: AuthUser) => Promise<void>;
  logout: () => Promise<void>;
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

  // Restore session from storage on app start
  useEffect(() => {
    async function loadSession() {
      try {
        const storedToken = await getItem("accessToken");
        const storedUser = await getItem("user");
        if (storedToken && storedUser) {
          setAccessToken(storedToken);
          setUser(JSON.parse(storedUser));
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
    setAccessToken(newAccessToken);
    setUser(newUser);

    // Register device for push notifications — failure must not block login
    registerForPushNotifications(fetchWithAuth).catch((err) => {
      console.error("Failed to register for push notifications:", err);
    });
  }

  async function logout() {
    await deleteItem("accessToken");
    await deleteItem("refreshToken");
    await deleteItem("user");
    setAccessToken(null);
    setUser(null);
  }

  async function refreshAccessToken(): Promise<string | null> {
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
      return data.accessToken;
    } catch {
      await logout();
      return null;
    }
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
    <AuthContext.Provider value={{ user, accessToken, isLoading, login, logout, fetchWithAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
