"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PlatformAnalyticsRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/super-admin/analytics");
  }, [router]);
  return null;
}
