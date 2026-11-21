"use client";

import * as React from "react";
import Link from "next/link";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import RestaurantMenuRoundedIcon from "@mui/icons-material/RestaurantMenuRounded";
import QrCode2RoundedIcon from "@mui/icons-material/QrCode2Rounded";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import AdminPanelSettingsRoundedIcon from "@mui/icons-material/AdminPanelSettingsRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import ThemeToggle from "@/components/common/ThemeToggle";

const highlights = [
  {
    icon: <QrCode2RoundedIcon />,
    title: "QR table ordering",
    text: "Guests scan a table code, browse the menu, and place orders from their own device with less waiting.",
  },
  {
    icon: <RestaurantMenuRoundedIcon />,
    title: "Menu & table management",
    text: "Organize categories, items, pricing, availability, and table setup from a clean admin experience.",
  },
  {
    icon: <DashboardRoundedIcon />,
    title: "Live order operations",
    text: "Track orders and keep service moving with a workflow built for busy restaurant and café teams.",
  },
  {
    icon: <InsightsRoundedIcon />,
    title: "Sales analytics",
    text: "Review performance and operational data to understand what is selling and where attention is needed.",
  },
  {
    icon: <AdminPanelSettingsRoundedIcon />,
    title: "Role-based access",
    text: "Separate business administration and platform controls with the right access for each role.",
  },
  {
    icon: <PaymentsRoundedIcon />,
    title: "Billing & operations",
    text: "Support subscriptions, usage visibility, notifications, and operational controls for multi-business management.",
  },
];

const faqs = [
  {
    q: "What is KhajaPOS?",
    a: "KhajaPOS is a restaurant POS and billing software platform that helps food businesses manage QR table ordering, menus, tables, live orders, and operations.",
  },
  {
    q: "Does KhajaPOS support QR table ordering?",
    a: "Yes. Guests can scan a table code, browse the menu, and place orders from their own device.",
  },
  {
    q: "Can I manage menus, tables, and orders in one place?",
    a: "Yes. KhajaPOS includes admin tools for menu and table management, live order operations, and business visibility.",
  },
  {
    q: "Is KhajaPOS suitable for restaurants in Nepal?",
    a: "KhajaPOS is built for restaurants, cafés, and food businesses looking for a modern POS and table ordering workflow, including teams operating in Nepal.",
  },
];

const navLinks = [
  { label: "Features", href: "/features" },
  { label: "Pricing", href: "/pricing" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact", href: "/contact" },
  { label: "About", href: "/about" },
];

export default function MarketingHome() {
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
          sx={{
            minHeight: 68,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1.5,
            py: 1,
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
            <Box
              component={Link}
              href="/"
              aria-label="KhajaPOS home"
              sx={{ display: "inline-flex", alignItems: "center", gap: 1, textDecoration: "none", color: "inherit", minWidth: 0 }}
            >
              <Box
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: "12px",
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 950,
                  color: "var(--primary-foreground)",
                  background:
                    "linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 55%, var(--accent)))",
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
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center" sx={{ display: { xs: "none", md: "flex" } }}>
            {navLinks.map((item) => (
              <Button key={item.href} component={Link} href={item.href} color="inherit" sx={{ textTransform: "none", fontWeight: 750, color: "var(--muted-foreground)" }}>
                {item.label}
              </Button>
            ))}
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center">
            <ThemeToggle />
            <Button
              component={Link}
              href="/auth/login"
              variant="contained"
              sx={{
                minHeight: 42,
                px: 2,
                borderRadius: "12px",
                fontWeight: 900,
                textTransform: "none",
                boxShadow: "0 10px 22px color-mix(in srgb, var(--primary) 24%, transparent)",
              }}
            >
              Login / Open App
            </Button>
          </Stack>
        </Container>
      </Box>

      <Container component="main" maxWidth="lg" sx={{ py: { xs: 4, md: 7 } }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1.15fr 0.85fr" },
            gap: { xs: 2, md: 3 },
            alignItems: "stretch",
          }}
        >
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2.25, sm: 3, md: 4 },
              borderRadius: { xs: "22px", md: "28px" },
              border: "1px solid var(--border)",
              backgroundColor: "color-mix(in srgb, var(--card) 92%, transparent)",
              backgroundImage: "var(--surface-gradient)",
              boxShadow: "var(--soft-shadow)",
              minWidth: 0,
            }}
          >
            <Chip
              label="POS software for restaurants in Nepal"
              sx={{
                mb: 2,
                fontWeight: 850,
                color: "var(--primary)",
                backgroundColor: "color-mix(in srgb, var(--primary) 12%, transparent)",
                border: "1px solid color-mix(in srgb, var(--primary) 24%, transparent)",
              }}
            />
            <Typography
              component="h1"
              sx={{
                fontSize: { xs: "2rem", sm: "2.55rem", md: "3.15rem" },
                lineHeight: 1.06,
                fontWeight: 950,
                letterSpacing: "-0.02em",
              }}
            >
              Restaurant POS and billing software for faster service.
            </Typography>
            <Typography
              sx={{
                mt: 1.75,
                fontSize: { xs: "0.98rem", md: "1.06rem" },
                lineHeight: 1.7,
                color: "var(--muted-foreground)",
                maxWidth: 720,
              }}
            >
              KhajaPOS helps food businesses handle QR table ordering, menus, tables, live orders, and
              day-to-day operations from one platform. Built for restaurants and cafés that want a simple,
              modern POS workflow.
            </Typography>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} sx={{ mt: 3 }}>
              <Button component={Link} href="/auth/register" variant="contained" size="large" sx={{ minHeight: 50, px: 2.5, borderRadius: "14px", fontWeight: 900, textTransform: "none" }}>
                Create account
              </Button>
              <Button component={Link} href="/auth/login" variant="outlined" size="large" sx={{ minHeight: 50, px: 2.5, borderRadius: "14px", fontWeight: 850, textTransform: "none", borderColor: "var(--border)", color: "var(--foreground)" }}>
                Login / Open App
              </Button>
            </Stack>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2.5 }}>
              {["QR ordering", "Restaurant billing", "Live operations", "Role-based access"].map((item) => (
                <Chip key={item} label={item} size="small" sx={{ fontWeight: 800, backgroundColor: "color-mix(in srgb, var(--muted) 72%, transparent)", border: "1px solid var(--border)" }} />
              ))}
            </Stack>
          </Paper>

          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, sm: 2.5, md: 3 },
              borderRadius: { xs: "22px", md: "28px" },
              border: "1px solid color-mix(in srgb, var(--sidebar-primary) 20%, var(--border))",
              background:
                "radial-gradient(circle at 20% 10%, color-mix(in srgb, var(--sidebar-primary) 28%, transparent), transparent 38%), radial-gradient(circle at 88% 88%, color-mix(in srgb, var(--accent) 16%, transparent), transparent 40%), linear-gradient(160deg, var(--sidebar), color-mix(in srgb, var(--sidebar-accent) 50%, var(--sidebar)))",
              color: "var(--sidebar-foreground)",
              boxShadow: "var(--soft-shadow)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              minWidth: 0,
            }}
          >
            <Box>
              <Typography sx={{ fontSize: "0.74rem", letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 900, color: "var(--sidebar-primary)" }}>
                Built for service flow
              </Typography>
              <Typography sx={{ mt: 1, fontSize: { xs: "1.35rem", md: "1.6rem" }, fontWeight: 900, lineHeight: 1.2 }}>
                From table scan to fulfilled order.
              </Typography>
              <Typography sx={{ mt: 1.25, color: "color-mix(in srgb, var(--sidebar-foreground) 84%, transparent)", lineHeight: 1.7 }}>
                Give guests a simple ordering experience while keeping staff focused on preparation, service, and accurate updates.
              </Typography>
            </Box>
            <Stack spacing={1} sx={{ mt: 2.5 }}>
              {[
                "Customers browse and place orders by table code",
                "Admins manage menus, tables, categories, and orders",
                "Platform controls support business operations and roles",
              ].map((item, i) => (
                <Stack key={item} direction="row" spacing={1.25} alignItems="flex-start" sx={{ p: 1.35, borderRadius: "16px", border: "1px solid color-mix(in srgb, var(--sidebar-primary) 18%, transparent)", backgroundColor: "color-mix(in srgb, var(--sidebar-accent) 58%, transparent)" }}>
                  <Box sx={{ mt: 0.1, width: 24, height: 24, borderRadius: "999px", display: "grid", placeItems: "center", fontSize: "0.74rem", fontWeight: 950, color: "var(--sidebar)", backgroundColor: "var(--sidebar-primary)", flexShrink: 0 }}>{i + 1}</Box>
                  <Typography sx={{ fontWeight: 750, lineHeight: 1.45, fontSize: "0.92rem" }}>{item}</Typography>
                </Stack>
              ))}
            </Stack>
          </Paper>
        </Box>

        <Box id="features" component="section" sx={{ mt: { xs: 3, md: 4 }, scrollMarginTop: 96 }}>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "flex-end" }} spacing={1} sx={{ mb: 1.75 }}>
            <Box>
              <Typography sx={{ fontSize: "0.74rem", letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 900, color: "var(--primary)" }}>Features</Typography>
              <Typography component="h2" sx={{ mt: 0.5, fontSize: { xs: "1.4rem", md: "1.85rem" }, fontWeight: 950 }}>
                Practical features for restaurants and food businesses
              </Typography>
            </Box>
          </Stack>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(3, minmax(0, 1fr))" }, gap: { xs: 1.25, md: 1.5 } }}>
            {highlights.map((item) => (
              <Paper key={item.title} elevation={0} sx={{ p: 2, borderRadius: "20px", border: "1px solid var(--border)", backgroundColor: "color-mix(in srgb, var(--card) 90%, transparent)", boxShadow: "0 10px 26px color-mix(in srgb, var(--foreground) 5%, transparent)", minWidth: 0 }}>
                <Stack direction="row" spacing={1.25} alignItems="flex-start">
                  <Box sx={{ width: 42, height: 42, borderRadius: "13px", display: "grid", placeItems: "center", color: "var(--primary)", backgroundColor: "color-mix(in srgb, var(--primary) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--primary) 22%, transparent)", flexShrink: 0 }}>{item.icon}</Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography component="h3" sx={{ fontWeight: 900, fontSize: "1rem", lineHeight: 1.2 }}>{item.title}</Typography>
                    <Typography sx={{ mt: 0.6, color: "var(--muted-foreground)", lineHeight: 1.6, fontSize: "0.92rem" }}>{item.text}</Typography>
                  </Box>
                </Stack>
              </Paper>
            ))}
          </Box>
        </Box>

        <Box id="pricing" component="section" sx={{ mt: { xs: 3, md: 4 }, scrollMarginTop: 96 }}>
          <Typography sx={{ fontSize: "0.74rem", letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 900, color: "var(--primary)" }}>Pricing</Typography>
          <Typography component="h2" sx={{ mt: 0.5, fontSize: { xs: "1.4rem", md: "1.85rem" }, fontWeight: 950 }}>Simple pricing for your business</Typography>
          <Paper elevation={0} sx={{ mt: 1.5, p: { xs: 2, md: 3 }, borderRadius: "20px", border: "1px solid var(--border)", backgroundColor: "color-mix(in srgb, var(--card) 90%, transparent)" }}>
            <Typography sx={{ color: "var(--muted-foreground)", lineHeight: 1.7 }}>
              Pricing plans depend on your business needs. Contact us for current KhajaPOS pricing, setup, and subscription details. {/* TODO: replace with real pricing tiers */}
            </Typography>
            <Button component={Link} href="/contact" variant="outlined" sx={{ mt: 2, minHeight: 44, borderRadius: "12px", fontWeight: 850, textTransform: "none" }}>Contact for pricing</Button>
          </Paper>
        </Box>

        <Box id="faq" component="section" sx={{ mt: { xs: 3, md: 4 }, scrollMarginTop: 96 }}>
          <Typography sx={{ fontSize: "0.74rem", letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 900, color: "var(--primary)" }}>FAQ</Typography>
          <Typography component="h2" sx={{ mt: 0.5, fontSize: { xs: "1.4rem", md: "1.85rem" }, fontWeight: 950 }}>Frequently asked questions</Typography>
          <Stack spacing={1} sx={{ mt: 1.5 }}>
            {faqs.map((item) => (
              <Accordion key={item.q} disableGutters elevation={0} sx={{ border: "1px solid var(--border)", borderRadius: "14px !important", backgroundColor: "color-mix(in srgb, var(--card) 90%, transparent)", "&:before": { display: "none" } }}>
                <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
                  <Typography component="h3" sx={{ fontWeight: 850, fontSize: "0.98rem" }}>{item.q}</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography sx={{ color: "var(--muted-foreground)", lineHeight: 1.7 }}>{item.a}</Typography>
                </AccordionDetails>
              </Accordion>
            ))}
          </Stack>
        </Box>

        <Box id="contact" component="section" sx={{ mt: { xs: 3, md: 4 }, scrollMarginTop: 96 }}>
          <Typography sx={{ fontSize: "0.74rem", letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 900, color: "var(--primary)" }}>Contact</Typography>
          <Typography component="h2" sx={{ mt: 0.5, fontSize: { xs: "1.4rem", md: "1.85rem" }, fontWeight: 950 }}>Get in touch</Typography>
          <Paper elevation={0} sx={{ mt: 1.5, p: { xs: 2, md: 3 }, borderRadius: "20px", border: "1px solid var(--border)", backgroundColor: "color-mix(in srgb, var(--card) 90%, transparent)" }}>
            <Typography sx={{ color: "var(--muted-foreground)", lineHeight: 1.7 }}>
              Need KhajaPOS for your restaurant or café? Reach out for demos, pricing, and onboarding.
            </Typography>
            <Typography sx={{ mt: 1, color: "var(--muted-foreground)", lineHeight: 1.7 }}>
              Email: <Box component="a" href="mailto:support@khajapos.com" sx={{ color: "var(--primary)", fontWeight: 700, textDecoration: "none" }}>support@khajapos.com</Box> {/* TODO: confirm real contact email */}
            </Typography>
            <Typography sx={{ mt: 0.5, color: "var(--muted-foreground)", lineHeight: 1.7 }}>
              Phone: <Box component="span" sx={{ fontWeight: 700 }}>+977-XXXXXXXXXX</Box> {/* TODO: add real phone number */}
            </Typography>
          </Paper>
        </Box>

        <Divider sx={{ my: { xs: 3, md: 4 }, borderColor: "color-mix(in srgb, var(--border) 80%, transparent)" }} />

        <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.5, md: 3 }, borderRadius: "22px", border: "1px solid var(--border)", backgroundColor: "color-mix(in srgb, var(--card) 88%, transparent)", display: "flex", flexDirection: { xs: "column", sm: "row" }, alignItems: { xs: "stretch", sm: "center" }, justifyContent: "space-between", gap: 1.5 }}>
          <Box>
            <Typography component="h2" sx={{ fontWeight: 950, fontSize: { xs: "1.1rem", md: "1.25rem" } }}>Ready to access your dashboard?</Typography>
            <Typography sx={{ mt: 0.35, color: "var(--muted-foreground)", lineHeight: 1.6 }}>Sign in to manage your business, or create an account to get started.</Typography>
          </Box>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Button component={Link} href="/auth/login" variant="contained" sx={{ minHeight: 46, px: 2.25, borderRadius: "13px", fontWeight: 900, textTransform: "none", whiteSpace: "nowrap" }}>Login / Open App</Button>
            <Button component={Link} href="/auth/register" variant="outlined" sx={{ minHeight: 46, px: 2.25, borderRadius: "13px", fontWeight: 850, textTransform: "none", whiteSpace: "nowrap" }}>Register</Button>
          </Stack>
        </Paper>

        <Box component="footer" sx={{ mt: 2.5, pt: 2, pb: 1, borderTop: "1px solid color-mix(in srgb, var(--border) 72%, transparent)" }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="center" useFlexGap flexWrap="wrap" sx={{ mb: 1.25 }}>
            {navLinks.map((item) => (
              <Button key={item.href} component={Link} href={item.href} size="small" sx={{ textTransform: "none", fontWeight: 700, color: "var(--muted-foreground)" }}>{item.label}</Button>
            ))}
            <Button component={Link} href="/terms" size="small" sx={{ textTransform: "none", fontWeight: 700, color: "var(--muted-foreground)" }}>Terms</Button>
            <Button component={Link} href="/privacy" size="small" sx={{ textTransform: "none", fontWeight: 700, color: "var(--muted-foreground)" }}>Privacy</Button>
          </Stack>
          <Typography sx={{ color: "var(--muted-foreground)", fontSize: "0.82rem", lineHeight: 1.6, textAlign: "center" }}>KhajaPOS — Restaurant POS and billing software for QR table ordering and operations.</Typography>
          <Typography sx={{ mt: 0.35, color: "var(--muted-foreground)", fontSize: "0.78rem", lineHeight: 1.6, textAlign: "center" }}>© {new Date().getFullYear()} KhajaPOS &amp; mzaarik. All rights reserved.</Typography>
        </Box>
      </Container>
    </Box>
  );
}