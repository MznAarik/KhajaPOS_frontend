"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Box, Skeleton, Stack, Typography } from "@mui/material";
import LockPersonOutlinedIcon from "@mui/icons-material/LockPersonOutlined";
import { useAuth } from "@/lib/auth-context";

const SUPERADMIN_PATHS = ["/admin/users", "/admin/restaurants"];
const OWNER_PATHS = [
  "/admin/dashboard",
  "/admin/category",
  "/admin/menu",
  "/admin/tables",
  "/admin/orders",
];

const matches = (pathname: string, paths: string[]) =>
  paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));

export default function RoleGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isSuperAdmin, isAdmin, loading } = useAuth();
  const redirected = React.useRef(false);

  React.useEffect(() => {
    if (redirected.current || loading) return;
    if (!pathname?.startsWith("/admin")) return;

    if (isSuperAdmin && matches(pathname, OWNER_PATHS)) {
      redirected.current = true;
      router.replace("/admin/users");
      return;
    }

    if (isAdmin && matches(pathname, SUPERADMIN_PATHS)) {
      redirected.current = true;
      router.replace("/admin/dashboard");
    }
  }, [pathname, router, isSuperAdmin, isAdmin, loading]);

  if (loading) {
    return (
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Stack spacing={2}>
          <Skeleton variant="rounded" height={72} sx={{ borderRadius: "20px" }} />
          <Skeleton variant="rounded" height={320} sx={{ borderRadius: "20px" }} />
        </Stack>
      </Box>
    );
  }

  if (matches(pathname, SUPERADMIN_PATHS) && !isSuperAdmin) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", py: 8 }}>
        <Stack alignItems="center" spacing={1.5} sx={{ textAlign: "center" }}>
          <LockPersonOutlinedIcon sx={{ fontSize: 44, color: "var(--muted-foreground)" }} />
          <Typography sx={{ fontWeight: 850, fontSize: "1.1rem" }}>
            Super admin access required
          </Typography>
          <Typography sx={{ color: "var(--muted-foreground)", fontSize: "0.9rem" }}>
            Your account does not have permission to manage users or restaurants.
          </Typography>
        </Stack>
      </Box>
    );
  }

  if (matches(pathname, OWNER_PATHS) && isSuperAdmin) {
    return null;
  }

  return <>{children}</>;
}
