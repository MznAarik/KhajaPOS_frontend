import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to your KhajaPOS account to manage orders, menus, tables, and operations.",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
  alternates: {
    canonical: "/auth/login",
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
