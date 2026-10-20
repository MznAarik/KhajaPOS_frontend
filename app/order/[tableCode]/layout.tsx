import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Table menu",
  description:
    "Browse the menu, customize your items and place your order directly from your table with KhajaPOS.",
  robots: { index: false, follow: false },
};

export default function TableMenuLayout({ children }: { children: React.ReactNode }) {
  return children;
}
