import * as React from "react";
import RecentOrderClient from "./recent-client";

export default function RecentOrderPage() {
  return (
    <React.Suspense fallback={null}>
      <RecentOrderClient />
    </React.Suspense>
  );
}
