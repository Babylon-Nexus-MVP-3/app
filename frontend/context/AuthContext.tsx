import { createContext, useContext, useEffect, useState } from "react";
import { saveItem, getItem, deleteItem } from "@/lib/storage";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  role: "PM" | "Subbie" | "Owner" | "Builder" | "Consultant";
  verticalGroup?: string;
  horizontalAttribute?: string;
  licenceNumber?: string;
  status: "Pending" | "Active";
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (accessToken: string, refreshToken: string, user: AuthUser) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  async function login(
    newAccessToken: string,
    refreshToken: string,
    newUser: AuthUser,
  ) {
    await saveItem("accessToken", newAccessToken);
    await saveItem("refreshToken", refreshToken);
    await saveItem("user", JSON.stringify(newUser));
    setAccessToken(newAccessToken);
    setUser(newUser);
  }

  async function logout() {
    await deleteItem("accessToken");
    await deleteItem("refreshToken");
    await deleteItem("user");
    setAccessToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, accessToken, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
