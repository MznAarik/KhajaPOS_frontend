import type { Metadata } from "next";
import { Box, Paper, Stack, Typography } from "@mui/material";
import MarketingShell from "@/components/marketing/MarketingShell";
import { SITE_OG_IMAGE } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Features",
  description: "Explore KhajaPOS features: QR table ordering, menu and table management, live orders, billing workflows, analytics, and role-based access.",
  alternates: { canonical: "/features" },
  openGraph: { title: "KhajaPOS Features", description: "Explore KhajaPOS features for restaurants and cafés.", url: "/features", images: [{ url: SITE_OG_IMAGE, width: 1200, height: 630, alt: "KhajaPOS features" }] },
  robots: { index: true, follow: true },
};

const features = [
  { title: "QR table ordering", desc: "Let guests scan a table code, browse your menu, and place orders from their device. This helps reduce waiting and keeps order details clear." },
  { title: "Menu management", desc: "Manage categories, items, pricing, and availability so your menu stays accurate across service." },
  { title: "Table management", desc: "Organize tables and table codes to support dine-in ordering and smoother front-of-house operations." },
  { title: "Live order operations", desc: "Track incoming orders and keep staff aligned during busy service periods." },
  { title: "Billing and POS workflows", desc: "Support restaurant billing and day-to-day point-of-sale operations in one system. {/* TODO: confirm supported payment/billing details */}" },
  { title: "Analytics and visibility", desc: "Review sales and operational information to understand business performance over time." },
  { title: "Role-based access", desc: "Use role-aware access for business admins, staff, and platform operations where applicable." },
  { title: "Multi-business platform controls", desc: "KhajaPOS includes platform-level administration for managing businesses and operational oversight. {/* TODO: confirm public-facing plan/feature packaging */}" },
];

export default function FeaturesPage() {
  return (
    <MarketingShell>
      <Stack component="section" spacing={1.5} sx={{ mb: 3 }}>
        <Typography component="h1" sx={{ fontSize: { xs: "2rem", md: "2.8rem" }, fontWeight: 950, lineHeight: 1.1 }}>
          Features built for restaurant operations
        </Typography>
        <Typography sx={{ color: "var(--muted-foreground)", lineHeight: 1.7, maxWidth: 760 }}>
          KhajaPOS brings QR ordering, menu management, live orders, and business visibility into one POS workflow for restaurants and cafés.
        </Typography>
      </Stack>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0,1fr))" }, gap: 1.5 }}>
        {features.map((f) => (
          <Paper key={f.title} component="article" elevation={0} sx={{ p: 2.25, borderRadius: "18px", border: "1px solid var(--border)", backgroundColor: "color-mix(in srgb, var(--card) 90%, transparent)" }}>
            <Typography component="h2" sx={{ fontWeight: 900, fontSize: "1.05rem" }}>{f.title}</Typography>
            <Typography sx={{ mt: 0.75, color: "var(--muted-foreground)", lineHeight: 1.7 }}>{f.desc}</Typography>
          </Paper>
        ))}
      </Box>
    </MarketingShell>
  );
}
