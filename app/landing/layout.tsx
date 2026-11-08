import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "KhajaPOS — QR Table Ordering & POS Platform",
  description:
    "KhajaPOS helps restaurants and cafés manage QR table ordering, menus, tables, live orders, and business operations with role-based admin and platform controls.",
};

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
