"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Box, Skeleton, Stack, Typography } from "@mui/material";
import LockPersonOutlinedIcon from "@mui/icons-material/LockPersonOutlined";
import { useAuth } from "@/lib/auth-context";
import {
  OWNER_PATHS,
  SUPERADMIN_PATHS,
  homeForRole,
  matchesPath,
} from "@/lib/role-home";

export default function RoleGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isSuperAdmin, isAdmin, loading } = useAuth();
  const redirected = React.useRef(false);

  React.useEffect(() => {
    if (redirected.current || loading) return;
    if (!pathname?.startsWith("/admin")) return;

    if (isSuperAdmin && matchesPath(pathname, OWNER_PATHS)) {
      redirected.current = true;
      router.replace(homeForRole("super_admin"));
      return;
    }

    if (isAdmin && matchesPath(pathname, SUPERADMIN_PATHS)) {
      redirected.current = true;
      router.replace(homeForRole("admin"));
      return;
    }

    if (!isSuperAdmin && !isAdmin && user) {
      redirected.current = true;
      router.replace(homeForRole("user"));
    }
  }, [pathname, router, isSuperAdmin, isAdmin, loading, user]);

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

  if (matchesPath(pathname ?? "", SUPERADMIN_PATHS) && !isSuperAdmin) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", py: 8 }}>
        <Stack alignItems="center" spacing={1.5} sx={{ textAlign: "center" }}>
          <LockPersonOutlinedIcon sx={{ fontSize: 44, color: "var(--muted-foreground)" }} />
          <Typography sx={{ fontWeight: 850, fontSize: "1.1rem" }}>
            Super admin access required
          </Typography>
          <Typography sx={{ color: "var(--muted-foreground)", fontSize: "0.9rem" }}>
            Your account does not have permission to manage users, businesses, or platform analytics.
          </Typography>
        </Stack>
      </Box>
    );
  }

  if (matchesPath(pathname ?? "", OWNER_PATHS) && isSuperAdmin) {
    return null;
  }

  if (user?.role === "user" && pathname?.startsWith("/admin")) {
    return null;
  }

  return <>{children}</>;
}
