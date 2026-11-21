import type { Metadata } from "next";
import { Paper, Stack, Typography } from "@mui/material";
import MarketingShell from "@/components/marketing/MarketingShell";
import { SITE_OG_IMAGE } from "@/lib/seo";

export const metadata: Metadata = {
  title: "About",
  description: "Learn about KhajaPOS, restaurant POS and billing software built to support QR table ordering and day-to-day restaurant operations.",
  alternates: { canonical: "/about" },
  openGraph: { title: "About KhajaPOS", description: "Restaurant POS and billing software for modern food businesses.", url: "/about", images: [{ url: SITE_OG_IMAGE, width: 1200, height: 630, alt: "About KhajaPOS" }] },
  robots: { index: true, follow: true },
};

export default function AboutPage() {
  return (
    <MarketingShell>
      <Stack component="section" spacing={1.5} sx={{ mb: 3 }}>
        <Typography component="h1" sx={{ fontSize: { xs: "2rem", md: "2.8rem" }, fontWeight: 950, lineHeight: 1.1 }}>
          About KhajaPOS
        </Typography>
        <Typography sx={{ color: "var(--muted-foreground)", lineHeight: 1.7, maxWidth: 760 }}>
          KhajaPOS is restaurant POS and billing software designed to help food businesses run smoother service with QR table ordering, menu management, live orders, and operational visibility.
        </Typography>
      </Stack>

      <Stack spacing={1.5}>
        <Paper component="section" elevation={0} sx={{ p: 2.25, borderRadius: "18px", border: "1px solid var(--border)", backgroundColor: "color-mix(in srgb, var(--card) 90%, transparent)" }}>
          <Typography component="h2" sx={{ fontWeight: 900, fontSize: "1.1rem" }}>What we focus on</Typography>
          <Typography sx={{ mt: 0.75, color: "var(--muted-foreground)", lineHeight: 1.7 }}>
            We focus on practical workflows for restaurants and cafés: clear ordering, manageable menus and tables, and tools that support staff during real service. We avoid unnecessary complexity and aim for a system teams can actually use every day.
          </Typography>
        </Paper>

        <Paper component="section" elevation={0} sx={{ p: 2.25, borderRadius: "18px", border: "1px solid var(--border)", backgroundColor: "color-mix(in srgb, var(--card) 90%, transparent)" }}>
          <Typography component="h2" sx={{ fontWeight: 900, fontSize: "1.1rem" }}>Built for Nepal and beyond</Typography>
          <Typography sx={{ mt: 0.75, color: "var(--muted-foreground)", lineHeight: 1.7 }}>
            KhajaPOS is being built with the needs of local restaurants and cafés in mind, while keeping the product flexible for growing food businesses. {/* TODO: add company/founder story, location, and verified milestones when available */}
          </Typography>
        </Paper>
      </Stack>
    </MarketingShell>
  );
}
