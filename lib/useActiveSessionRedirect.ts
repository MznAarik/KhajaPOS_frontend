"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { clearAuthSession } from "@/lib/api";
import { landingForRole } from "@/lib/role-home";

/**
 * When an `authSession` cookie is present on a public auth page, resolve the
 * signed-in user's role and forward them to that role's home. A stale cookie is
 * cleared so the visitor can sign in normally.
 *
 * Returns `true` while the session check is in flight.
 */
export function useActiveSessionRedirect(): boolean {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (!document.cookie.includes("authSession=")) return;

    let active = true;
    setCheckingSession(true);

    const redirectActiveSession = async () => {
      try {
        const res = await fetch("/api/svc/user", {
          credentials: "same-origin",
          headers: { Accept: "application/json" },
        });

        if (!res.ok) {
          await clearAuthSession();
          return;
        }

        const body = await res.json().catch(() => null);
        const role = body?.data?.role as string | undefined;

        if (!active || !role) return;

        const params = new URLSearchParams(window.location.search);
        router.replace(landingForRole(role, params.get("redirect")));
      } catch {
        // Network hiccup — fall back to the page's normal content.
      } finally {
        if (active) setCheckingSession(false);
      }
    };

    void redirectActiveSession();

    return () => {
      active = false;
    };
  }, [router]);

  return checkingSession;
}
