"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import type { UserRole } from "@/models/User";

export interface UserDetails {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  schoolId?: string | null;
  mustChangePassword?: boolean;
}

interface UserContextType {
  user: UserDetails | null;
  token: string | null;
  isLoading: boolean;
  login: (userData: UserDetails, token: string) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<UserDetails | null>>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({
  children,
  user: initialUser,
  token: initialToken,
}: {
  children: ReactNode;
  user?: UserDetails | null;
  token?: string | null;
}) {
  const [token, setToken] = useState<string | null>(() => {
    if (initialToken) return initialToken;
    if (typeof window === "undefined") return null;
    try {
      return localStorage.getItem("erp_auth_token");
    } catch {
      return null;
    }
  });

  const [user, setUser] = useState<UserDetails | null>(() => {
    if (initialUser) return initialUser;
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem("erp_user_data");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [isLoading] = useState<boolean>(false);

  const login = useCallback((userData: UserDetails, authToken: string) => {
    setUser(userData);
    setToken(authToken);
    try {
      localStorage.setItem("erp_auth_token", authToken);
      localStorage.setItem("erp_user_data", JSON.stringify(userData));
      document.cookie = `erp_auth_token=${authToken}; path=/; max-age=604800; SameSite=Lax`;
    } catch (error) {
      console.error("Failed to save auth state to storage:", error);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Logout API call error:", err);
    }

    setUser(null);
    setToken(null);

    try {
      localStorage.removeItem("erp_auth_token");
      localStorage.removeItem("erp_user_data");
      document.cookie = "erp_auth_token=; path=/; max-age=0; SameSite=Lax";
    } catch (error) {
      console.error("Failed to clear auth storage:", error);
    }

    if (typeof window !== "undefined") {
      window.location.replace("/login");
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const currentToken =
      token ||
      (typeof window !== "undefined" ? localStorage.getItem("erp_auth_token") : null);
    if (!currentToken) return;

    try {
      const res = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${currentToken}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
          localStorage.setItem("erp_user_data", JSON.stringify(data.user));
        }
      } else if (res.status === 401) {
        await logout();
      }
    } catch (error) {
      console.error("Error refreshing user context:", error);
    }
  }, [token, logout]);

  return (
    <UserContext.Provider
      value={{
        user: initialUser !== undefined ? initialUser : user,
        token,
        isLoading,
        login,
        logout,
        refreshUser,
        setUser,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export default UserProvider;

/**
 * Custom hook to access UserContext across the application
 */
export function useUser(): UserContextType {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
