import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = getSiteUrl();
  const url = `${siteUrl}/landing`;
  const title = "KhajaPOS — QR Table Ordering & POS Platform";
  const description =
    "KhajaPOS helps restaurants and cafés manage QR table ordering, menus, tables, live orders, and business operations with role-based admin and platform controls.";

  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      title,
      description,
      siteName: "KhajaPOS",
      locale: "en_US",
      images: [
        {
          url: "/images.png",
          width: 512,
          height: 512,
          alt: "KhajaPOS — QR Table Ordering & POS Platform",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/images.png"],
    },
    robots: { index: true, follow: true },
  };
}

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
