import type { UserRole } from "@/lib/api";

/**
 * Where each role belongs after signing in / restoring a session.
 * Keep this in sync with `RoleGate` and the admin layout.
 */
export const ROLE_HOME: Record<UserRole, string> = {
  super_admin: "/super-admin/dashboard",
  admin: "/business-admin/dashboard",
  user: "/user",
};

export const SUPERADMIN_PATHS = ["/super-admin"];

export const OWNER_PATHS = ["/business-admin"];

export const matchesPath = (pathname: string, paths: string[]) =>
  paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));

export const homeForRole = (role?: string | null): string =>
  ROLE_HOME[(role ?? "") as UserRole] ?? ROLE_HOME.user;

export const isAdminPath = (pathname: string) =>
  ["/admin", "/super-admin", "/business-admin"].some(
    (base) => pathname === base || pathname.startsWith(`${base}/`),
  );

export const canRoleAccessPath = (
  role: string | null | undefined,
  pathname: string | null | undefined,
): boolean => {
  // Only same-origin absolute paths are ever honoured.
  if (!pathname || !pathname.startsWith("/") || pathname.startsWith("//")) {
    return false;
  }

  if (pathname === "/super-admin" || pathname.startsWith("/super-admin/")) return role === "super_admin";
  if (pathname === "/business-admin" || pathname.startsWith("/business-admin/")) return role === "admin";
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return false;
  if (isAdminPath(pathname)) return false;

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
