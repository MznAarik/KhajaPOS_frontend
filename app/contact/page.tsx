import type { Metadata } from "next";
import { Box, Paper, Stack, Typography } from "@mui/material";
import MarketingShell from "@/components/marketing/MarketingShell";
import { SITE_OG_IMAGE } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact KhajaPOS for demos, pricing, onboarding, and restaurant POS support inquiries.",
  alternates: { canonical: "/contact" },
  openGraph: { title: "Contact KhajaPOS", description: "Get in touch for demos, pricing, and onboarding.", url: "/contact", images: [{ url: SITE_OG_IMAGE, width: 1200, height: 630, alt: "Contact KhajaPOS" }] },
  robots: { index: true, follow: true },
};

export default function ContactPage() {
  return (
    <MarketingShell>
      <Stack component="section" spacing={1.5} sx={{ mb: 3 }}>
        <Typography component="h1" sx={{ fontSize: { xs: "2rem", md: "2.8rem" }, fontWeight: 950, lineHeight: 1.1 }}>
          Contact KhajaPOS
        </Typography>
        <Typography sx={{ color: "var(--muted-foreground)", lineHeight: 1.7, maxWidth: 760 }}>
          Need a demo, pricing details, or help getting started? Reach out and we&apos;ll point you in the right direction.
        </Typography>
      </Stack>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0,1fr))" }, gap: 1.5 }}>
        <Paper component="section" elevation={0} sx={{ p: 2.25, borderRadius: "18px", border: "1px solid var(--border)", backgroundColor: "color-mix(in srgb, var(--card) 90%, transparent)" }}>
          <Typography component="h2" sx={{ fontWeight: 900, fontSize: "1.1rem" }}>Contact details</Typography>
          <Stack spacing={1} sx={{ mt: 1.25, color: "var(--muted-foreground)", lineHeight: 1.7 }}>
            <Typography>
              Email: <Box component="a" href="mailto:support@khajapos.com" sx={{ color: "var(--primary)", fontWeight: 700, textDecoration: "none" }}>support@khajapos.com</Box> {/* TODO: confirm real contact email */}
            </Typography>
            <Typography>
              Phone: <Box component="span" sx={{ fontWeight: 700 }}>+977-XXXXXXXXXX</Box> {/* TODO: add real phone number */}
            </Typography>
            <Typography>
              Location: Kathmandu, Nepal {/* TODO: confirm business address/location */}
            </Typography>
          </Stack>
        </Paper>

        <Paper component="section" elevation={0} sx={{ p: 2.25, borderRadius: "18px", border: "1px solid var(--border)", backgroundColor: "color-mix(in srgb, var(--card) 90%, transparent)" }}>
          <Typography component="h2" sx={{ fontWeight: 900, fontSize: "1.1rem" }}>What to include</Typography>
          <Typography sx={{ mt: 1.25, color: "var(--muted-foreground)", lineHeight: 1.7 }}>
            For faster help, include your restaurant/café name, number of tables or locations, and whether you need QR ordering, billing, or a full POS setup.
          </Typography>
          <Typography sx={{ mt: 1, color: "var(--muted-foreground)", lineHeight: 1.7, fontStyle: "italic" }}>
            TODO: add contact form or booking link when available.
          </Typography>
        </Paper>
      </Box>
    </MarketingShell>
  );
}
