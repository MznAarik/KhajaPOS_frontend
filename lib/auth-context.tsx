"use client";

import * as React from "react";
import { api, type UserRole } from "@/lib/api";

export type SessionUser = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  business?: {
    id: number;
    name: string;
    business_type?: string;
  } | null;
};

export type AuthContextValue = {
  user: SessionUser | null;
  role: UserRole;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  loading: boolean;
  setUser: React.Dispatch<React.SetStateAction<SessionUser | null>>;
};

const FALLBACK: AuthContextValue = {
  user: null,
  role: "user",
  isSuperAdmin: false,
  isAdmin: false,
  loading: false,
  setUser: () => undefined,
};

const AuthContext = React.createContext<AuthContextValue>(FALLBACK);

type ProviderProps = {
  initialUser?: SessionUser | null;
  children: React.ReactNode;
};

export function AuthProvider({ initialUser, children }: ProviderProps) {
  const [user, setUser] = React.useState<SessionUser | null>(initialUser ?? null);
  const [loading, setLoading] = React.useState(!initialUser);

  React.useEffect(() => {
    if (initialUser || user) return;

    let active = true;

    (async () => {
      try {
        const res = await api.get("/user");
        const data = (res.data as { data?: SessionUser | null })?.data ?? null;
        if (active) setUser(data);
      } catch {
        if (active) setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [initialUser, user]);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      user,
      role: user?.role ?? "user",
      isSuperAdmin: user?.role === "super_admin",
      isAdmin: user?.role === "admin",
      loading,
      setUser,
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = (): AuthContextValue => React.useContext(AuthContext);
