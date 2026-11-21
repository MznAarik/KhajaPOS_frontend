import type { Metadata } from "next";
import { SITE_OG_IMAGE } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Pricing",
  description: "KhajaPOS pricing information for restaurants and cafés. Contact us for current plans, setup, and subscription details.",
  alternates: { canonical: "/pricing" },
  openGraph: { title: "KhajaPOS Pricing", description: "Contact KhajaPOS for current pricing and plan details.", url: "/pricing", images: [{ url: SITE_OG_IMAGE, width: 1200, height: 630, alt: "KhajaPOS pricing" }] },
  robots: { index: true, follow: true },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
