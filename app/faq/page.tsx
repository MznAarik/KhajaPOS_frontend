import type { Metadata } from "next";
import { Accordion, AccordionDetails, AccordionSummary, Stack, Typography } from "@mui/material";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import MarketingShell from "@/components/marketing/MarketingShell";
import { SITE_OG_IMAGE, getSiteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Frequently asked questions about KhajaPOS restaurant POS, QR table ordering, billing, menus, and operations.",
  alternates: { canonical: "/faq" },
  openGraph: { title: "KhajaPOS FAQ", description: "Answers to common questions about KhajaPOS.", url: "/faq", images: [{ url: SITE_OG_IMAGE, width: 1200, height: 630, alt: "KhajaPOS FAQ" }] },
  robots: { index: true, follow: true },
};

const faqs = [
  { q: "What is KhajaPOS?", a: "KhajaPOS is a restaurant POS and billing software platform that helps food businesses manage QR table ordering, menus, tables, live orders, and operations." },
  { q: "Does KhajaPOS support QR table ordering?", a: "Yes. Guests can scan a table code, browse the menu, and place orders from their own device." },
  { q: "Can I manage menus, tables, and orders in one place?", a: "Yes. KhajaPOS includes admin tools for menu and table management, live order operations, and business visibility." },
  { q: "Is KhajaPOS suitable for restaurants in Nepal?", a: "KhajaPOS is built for restaurants, cafés, and food businesses looking for a modern POS and table ordering workflow, including teams operating in Nepal." },
  { q: "How do I get pricing?", a: "Contact the KhajaPOS team for current pricing, onboarding, and plan details. Public pricing details may change as plans are finalized." },
  { q: "Can I try KhajaPOS?", a: "You can create an account to get started, or contact us for a demo and onboarding guidance. TODO: confirm trial/demo process." },
];

export default function FaqPage() {
  const siteUrl = getSiteUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a.replace(" TODO: confirm trial/demo process.", "") },
    })),
  };

  return (
    <MarketingShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Stack component="section" spacing={1.5} sx={{ mb: 3 }}>
        <Typography component="h1" sx={{ fontSize: { xs: "2rem", md: "2.8rem" }, fontWeight: 950, lineHeight: 1.1 }}>
          Frequently asked questions
        </Typography>
        <Typography sx={{ color: "var(--muted-foreground)", lineHeight: 1.7, maxWidth: 760 }}>
          Common questions about KhajaPOS, restaurant POS workflows, QR table ordering, and getting started.
        </Typography>
      </Stack>
      <Stack spacing={1}>
        {faqs.map((item) => (
          <Accordion key={item.q} disableGutters elevation={0} sx={{ border: "1px solid var(--border)", borderRadius: "14px !important", backgroundColor: "color-mix(in srgb, var(--card) 90%, transparent)", "&:before": { display: "none" } }}>
            <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
              <Typography component="h2" sx={{ fontWeight: 850, fontSize: "1rem" }}>{item.q}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography sx={{ color: "var(--muted-foreground)", lineHeight: 1.7 }}>{item.a}</Typography>
            </AccordionDetails>
          </Accordion>
        ))}
      </Stack>
    </MarketingShell>
  );
}
