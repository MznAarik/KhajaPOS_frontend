"use client";

import * as React from "react";
import Link from "next/link";
import { Box, Button, Container, Divider, Stack, Typography } from "@mui/material";
import ThemeToggle from "@/components/common/ThemeToggle";

const navLinks = [
  { label: "Features", href: "/features" },
  { label: "Pricing", href: "/pricing" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact", href: "/contact" },
  { label: "About", href: "/about" },
];

export default function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        minHeight: "100dvh",
        backgroundColor: "var(--background)",
        backgroundImage: "var(--page-gradient)",
        color: "var(--foreground)",
      }}
    >
      <Box
        component="header"
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          borderBottom: "1px solid color-mix(in srgb, var(--border) 78%, transparent)",
          backgroundColor: "color-mix(in srgb, var(--background) 82%, transparent)",
          backdropFilter: "blur(12px)",
        }}
      >
        <Container
          maxWidth="lg"
          sx={{ minHeight: 68, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5, py: 1 }}
        >
          <Box
            component={Link}
            href="/"
            aria-label="KhajaPOS home"
            sx={{ display: "inline-flex", alignItems: "center", gap: 1, textDecoration: "none", color: "inherit", minWidth: 0 }}
          >
            <Box
              sx={{
                width: 38, height: 38, borderRadius: "12px", display: "grid", placeItems: "center", fontWeight: 950,
                color: "var(--primary-foreground)",
                background: "linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 55%, var(--accent)))",
                boxShadow: "0 10px 24px color-mix(in srgb, var(--primary) 28%, transparent)",
              }}
            >
              K
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 950, fontSize: "1rem", lineHeight: 1.1 }}>KhajaPOS</Typography>
              <Typography sx={{ fontSize: "0.72rem", color: "var(--muted-foreground)", fontWeight: 700 }}>
                Restaurant POS &amp; billing software
              </Typography>
            </Box>
          </Box>

          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ display: { xs: "none", md: "flex" } }}>
            {navLinks.map((item) => (
              <Button key={item.href} component={Link} href={item.href} color="inherit" sx={{ textTransform: "none", fontWeight: 750, color: "var(--muted-foreground)" }}>
                {item.label}
              </Button>
            ))}
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center">
            <ThemeToggle />
            <Button component={Link} href="/auth/login" variant="contained" sx={{ minHeight: 42, px: 2, borderRadius: "12px", fontWeight: 900, textTransform: "none" }}>
              Login / Open App
            </Button>
          </Stack>
        </Container>
      </Box>

      <Container component="main" maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
        {children}
        <Divider sx={{ my: { xs: 3, md: 4 }, borderColor: "color-mix(in srgb, var(--border) 80%, transparent)" }} />
        <Box component="footer" sx={{ pt: 1, pb: 2 }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="center" useFlexGap flexWrap="wrap" sx={{ mb: 1.25 }}>
            {navLinks.map((item) => (
              <Button key={item.href} component={Link} href={item.href} size="small" sx={{ textTransform: "none", fontWeight: 700, color: "var(--muted-foreground)" }}>{item.label}</Button>
            ))}
            <Button component={Link} href="/terms" size="small" sx={{ textTransform: "none", fontWeight: 700, color: "var(--muted-foreground)" }}>Terms</Button>
            <Button component={Link} href="/privacy" size="small" sx={{ textTransform: "none", fontWeight: 700, color: "var(--muted-foreground)" }}>Privacy</Button>
          </Stack>
          <Typography sx={{ color: "var(--muted-foreground)", fontSize: "0.82rem", lineHeight: 1.6, textAlign: "center" }}>
            KhajaPOS — Restaurant POS and billing software for QR table ordering and operations.
          </Typography>
          <Typography sx={{ mt: 0.35, color: "var(--muted-foreground)", fontSize: "0.78rem", lineHeight: 1.6, textAlign: "center" }}>
            © {new Date().getFullYear()} KhajaPOS &amp; mzaarik. All rights reserved.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
