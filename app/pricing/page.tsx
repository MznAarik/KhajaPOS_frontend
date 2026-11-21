"use client";

import Link from "next/link";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import MarketingShell from "@/components/marketing/MarketingShell";

export default function PricingPage() {
  return (
    <MarketingShell>
      <Stack component="section" spacing={1.5} sx={{ mb: 3 }}>
        <Typography component="h1" sx={{ fontSize: { xs: "2rem", md: "2.8rem" }, fontWeight: 950, lineHeight: 1.1 }}>
          Pricing
        </Typography>
        <Typography sx={{ color: "var(--muted-foreground)", lineHeight: 1.7, maxWidth: 760 }}>
          We want pricing to be clear and accurate for your business. Contact us for current KhajaPOS plans, onboarding, and subscription details.
        </Typography>
      </Stack>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0,1fr))" }, gap: 1.5 }}>
        {[
          { name: "Starter", desc: "For small cafés or single-location businesses getting started with digital POS operations.", note: "TODO: confirm Starter plan features and price." },
          { name: "Growth", desc: "For growing restaurants that need stronger day-to-day operations and visibility.", note: "TODO: confirm Growth plan features and price." },
          { name: "Custom", desc: "For businesses with specific setup, onboarding, or multi-location needs.", note: "TODO: confirm custom/enterprise offering details." },
        ].map((plan) => (
          <Paper key={plan.name} component="article" elevation={0} sx={{ p: 2.25, borderRadius: "18px", border: "1px solid var(--border)", backgroundColor: "color-mix(in srgb, var(--card) 90%, transparent)" }}>
            <Typography component="h2" sx={{ fontWeight: 900, fontSize: "1.2rem" }}>{plan.name}</Typography>
            <Typography sx={{ mt: 0.75, color: "var(--muted-foreground)", lineHeight: 1.7 }}>{plan.desc}</Typography>
            <Typography sx={{ mt: 1.25, fontSize: "0.85rem", color: "var(--muted-foreground)", fontStyle: "italic" }}>{plan.note}</Typography>
          </Paper>
        ))}
      </Box>

      <Paper elevation={0} sx={{ mt: 2, p: 2.5, borderRadius: "18px", border: "1px solid var(--border)", backgroundColor: "color-mix(in srgb, var(--card) 90%, transparent)" }}>
        <Typography component="h2" sx={{ fontWeight: 900, fontSize: "1.1rem" }}>Need exact pricing?</Typography>
        <Typography sx={{ mt: 0.75, color: "var(--muted-foreground)", lineHeight: 1.7 }}>
          Contact our team for current pricing, setup assistance, and the right plan for your restaurant or café.
        </Typography>
        <Button component={Link} href="/contact" variant="contained" sx={{ mt: 1.5, minHeight: 44, borderRadius: "12px", fontWeight: 850, textTransform: "none" }}>
          Contact us
        </Button>
      </Paper>
    </MarketingShell>
  );
}
