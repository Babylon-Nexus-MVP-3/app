import { API_BASE_URL } from "@/constants/api";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { saveItem, getItem, deleteItem } from "@/lib/storage";
import { UserRole } from "@/types/roles";
import { registerForPushNotifications } from "@/lib/notifications";
import { clearVouchProfileCache } from "@/lib/vouchProfileCache";
import { splitLegacyName } from "@/lib/format";

export interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  /** Derived server-side from the two fields above — display only. */
  name: string;
  email: string;
  role: UserRole;
  status: "Pending" | "Active";
  mobile?: string;
  mobileVerified?: boolean;
  abn?: string;
  businessName?: string;
  businessTrade?: string;
}

/*
  A user object cached on a device before names were split carries only `name`.
  Normalise on the way in so an existing signed-in user never renders a blank
  name — this matters when /auth/me can't be reached on boot and the cached
  object is all we have.
*/
function normaliseUser(u: AuthUser): AuthUser {
  if (u.firstName) return u;
  const { firstName, lastName } = splitLegacyName(u.name);
  return { ...u, firstName, lastName };
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
          setUser(normaliseUser(JSON.parse(storedUser)));

          // Registration otherwise only runs on login, and a reinstall keeps
          // the keychain session but gets a new push token.
          registerForPushNotifications(fetchWithAuth, { prompt: false }).catch(() => {});

          // Fetch fresh user data so fields like mobileVerified are never stale.
          // Through fetchWithAuth, not raw fetch: the stored access token is
          // usually expired by the next cold start, and a raw 401 here left the
          // cached user in place until something else happened to refresh.
          try {
            const res = await fetchWithAuth(`${API_BASE_URL}/auth/me`);
            if (res.ok) {
              const data = await res.json();
              if (data.user) {
                const fresh = normaliseUser(data.user);
                setUser(fresh);
                await saveItem("user", JSON.stringify(fresh));
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
    const normalised = normaliseUser(newUser);
    await saveItem("user", JSON.stringify(normalised));
    accessTokenRef.current = newAccessToken;
    setAccessToken(newAccessToken);
    setUser(normalised);

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
    // The vouch profile cache outlives screen mounts, so drop it here or the
    // next user to sign in on this device sees the previous user's strength.
    clearVouchProfileCache();
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

        // Only a genuine auth rejection should end the session. A 429 or a 5xx
        // from a dead zone means "try again", not "your refresh token is bad".
        if (!res.ok) {
          if (res.status === 400 || res.status === 401 || res.status === 403) {
            await logout();
          }
          return null;
        }

        const data = await res.json();
        await saveItem("accessToken", data.accessToken);
        await saveItem("refreshToken", data.refreshToken);
        // Update the ref now rather than on the next render, so requests fired
        // in the meantime don't go out with the token that just expired.
        accessTokenRef.current = data.accessToken;
        setAccessToken(data.accessToken);
        if (data.user) {
          const fresh = normaliseUser(data.user);
          setUser(fresh);
          await saveItem("user", JSON.stringify(fresh));
        }
        return data.accessToken;
      } catch {
        // Network failure — keep the session and let the caller retry.
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

  /*
    The functions above are recreated every render. Screens list fetchWithAuth
    in useCallback/useEffect dependencies, so handing those out directly made
    every auth state change (a token refresh, a user patch) re-run every such
    effect and refetch. Each is exposed through a ref-backed wrapper whose
    identity never changes but which always calls the latest version.
  */
  const latest = useRef({ login, logout, updateUser, fetchWithAuth });
  latest.current = { login, logout, updateUser, fetchWithAuth };

  const stableLogin = useCallback<AuthState["login"]>((...a) => latest.current.login(...a), []);
  const stableLogout = useCallback(() => latest.current.logout(), []);
  const stableUpdateUser = useCallback<AuthState["updateUser"]>(
    (patch) => latest.current.updateUser(patch),
    []
  );
  const stableFetchWithAuth = useCallback<AuthState["fetchWithAuth"]>(
    (url, options) => latest.current.fetchWithAuth(url, options),
    []
  );

  const value = useMemo<AuthState>(
    () => ({
      user,
      accessToken,
      isLoading,
      login: stableLogin,
      logout: stableLogout,
      updateUser: stableUpdateUser,
      fetchWithAuth: stableFetchWithAuth,
    }),
    [user, accessToken, isLoading, stableLogin, stableLogout, stableUpdateUser, stableFetchWithAuth]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
