import type { UserRole } from "@/lib/api";

/**
 * Where each role belongs after signing in / restoring a session.
 * Keep this in sync with `RoleGate` and the admin layout.
 */
export const ROLE_HOME: Record<UserRole, string> = {
  super_admin: "/admin/analytics",
  admin: "/admin/dashboard",
  user: "/user",
};

export const SUPERADMIN_PATHS = ["/admin/users", "/admin/restaurants", "/admin/analytics"];

export const OWNER_PATHS = [
  "/admin/dashboard",
  "/admin/category",
  "/admin/menu",
  "/admin/tables",
  "/admin/orders",
];

export const matchesPath = (pathname: string, paths: string[]) =>
  paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));

export const homeForRole = (role?: string | null): string =>
  ROLE_HOME[(role ?? "") as UserRole] ?? ROLE_HOME.user;

export const isAdminPath = (pathname: string) =>
  pathname === "/admin" || pathname.startsWith("/admin/");

export const canRoleAccessPath = (
  role: string | null | undefined,
  pathname: string | null | undefined,
): boolean => {
  // Only same-origin absolute paths are ever honoured.
  if (!pathname || !pathname.startsWith("/") || pathname.startsWith("//")) {
    return false;
  }

  if (isAdminPath(pathname)) {
    if (role === "super_admin") return !matchesPath(pathname, OWNER_PATHS);
    if (role === "admin") return !matchesPath(pathname, SUPERADMIN_PATHS);
    return false;
  }

  return pathname === "/user" || pathname.startsWith("/user/");
};

/**
 * Prefer the requested redirect target when the role can open it,
 * otherwise fall back to that role's home.
 */
export const landingForRole = (
  role: string | null | undefined,
  requestedPath?: string | null,
): string =>
  canRoleAccessPath(role, requestedPath)
    ? (requestedPath as string)
    : homeForRole(role);
