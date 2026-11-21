"use client";

import * as React from "react";
import { api, type UserRole } from "@/lib/api";

export type SessionUser = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  business_id?: number | null;
  resolved_business_id?: number | null;
  business_role?: string | null;
  effective_permissions?: string[];
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
  isBusinessWorkspace: boolean;
  effectivePermissions: string[];
  hasPermission: (permission: string) => boolean;
  loading: boolean;
  setUser: React.Dispatch<React.SetStateAction<SessionUser | null>>;
};

const FALLBACK: AuthContextValue = {
  user: null,
  role: "user",
  isSuperAdmin: false,
  isAdmin: false,
  isBusinessWorkspace: false,
  effectivePermissions: [],
  hasPermission: () => false,
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
    () => {
      const effectivePermissions = Array.isArray(user?.effective_permissions)
        ? (user!.effective_permissions as string[])
        : [];
      const permissionSet = new Set(effectivePermissions);
      return {
        user,
        role: user?.role ?? "user",
        isSuperAdmin: user?.role === "super_admin",
        isAdmin: user?.role === "admin",
        isBusinessWorkspace:
          user?.role === "admin" ||
          user?.role === "manager" ||
          user?.role === "cashier" ||
          user?.role === "kitchen_staff",
        effectivePermissions,
        hasPermission: (permission: string) => permissionSet.has(permission),
        loading,
        setUser,
      };
    },
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = (): AuthContextValue => React.useContext(AuthContext);
