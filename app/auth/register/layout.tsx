import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/seo";

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  title: "Create your account",
  description:
    "Register your restaurant or café on KhajaPOS to start QR table ordering, menu and table management, and live operations.",
  alternates: {
    canonical: "/auth/register",
  },
  openGraph: {
    type: "website",
    url: `${siteUrl}/auth/register`,
    title: "Create your KhajaPOS account",
    description:
      "Register your restaurant or café on KhajaPOS to start QR table ordering and streamlined operations.",
    siteName: "KhajaPOS",
    images: [{ url: "/images.png", width: 512, height: 512, alt: "KhajaPOS" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Create your KhajaPOS account",
    description:
      "Register your restaurant or café on KhajaPOS to start QR table ordering and streamlined operations.",
    images: ["/images.png"],
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
