import type { Metadata } from "next";
import Link from "next/link";
import { Box, Container, Divider, Paper, Stack, Typography } from "@mui/material";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of Service for using KhajaPOS.",
  robots: { index: true, follow: true },
};

const sections: Array<{ title: string; body: string[] }> = [
  {
    title: "1. Acceptance of Terms",
    body: [
      "By creating an account, accessing, or using KhajaPOS (the \"Service\"), you agree to these Terms of Service and to our Privacy Policy. If you do not agree, do not use the Service.",
      "If you use the Service on behalf of a business, you represent that you have authority to bind that business to these terms.",
    ],
  },
  {
    title: "2. Service Description",
    body: [
      "KhajaPOS provides restaurant and hospitality point-of-sale and operations tools, which may include menu, table, order, staff, reporting, QR ordering, and related management features. Features may change over time.",
    ],
  },
  {
    title: "3. Accounts and Responsibilities",
    body: [
      "You are responsible for the accuracy of information you provide, maintaining the confidentiality of your credentials, and all activity under your account.",
      "You must notify us promptly of any unauthorized access or security incident involving your account.",
    ],
  },
  {
    title: "4. Your Data and Content",
    body: [
      "You retain ownership of business and customer data you submit to the Service (\"Customer Data\"). You grant us a limited license to host, store, process, transmit, back up, and display Customer Data solely as needed to provide, maintain, secure, and improve the Service and to comply with law.",
      "We do not sell your personal data or your business data to anyone.",
      "If required by applicable law, regulation, court order, legal process, or a valid request from government or law enforcement authorities, we may disclose relevant data as necessary to comply.",
      "You are responsible for ensuring you have the rights, notices, and consents required to collect and provide Customer Data (including customer/order information) to the Service.",
    ],
  },
  {
    title: "5. Acceptable Use",
    body: [
      "You agree not to misuse the Service, including by violating laws, infringing rights, attempting unauthorized access, disrupting systems, uploading malicious code, or using the Service for fraudulent or abusive purposes.",
    ],
  },
  {
    title: "6. Availability, Changes, and Support",
    body: [
      "We aim to keep the Service available but do not guarantee uninterrupted or error-free operation. We may modify, suspend, or discontinue features with reasonable efforts to minimize disruption where practical.",
    ],
  },
  {
    title: "7. Fees and Third-Party Services",
    body: [
      "If paid plans, subscriptions, or third-party integrations apply, additional terms or charges may apply as presented in the Service. You are responsible for applicable taxes unless stated otherwise.",
    ],
  },
  {
    title: "8. Termination",
    body: [
      "You may stop using the Service at any time. We may suspend or terminate access if you violate these terms, pose a security/legal risk, or as required by law. Provisions that by nature should survive (including data, disclaimers, and liability limits) will survive termination.",
    ],
  },
  {
    title: "9. Disclaimers and Limitation of Liability",
    body: [
      "THE SERVICE IS PROVIDED \"AS IS\" AND \"AS AVAILABLE\" TO THE MAXIMUM EXTENT PERMITTED BY LAW, WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED.",
      "TO THE MAXIMUM EXTENT PERMITTED BY LAW, KHAJAPOS AND ITS OPERATORS WILL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR FOR LOSS OF PROFITS, REVENUE, DATA, OR GOODWILL ARISING FROM OR RELATED TO THE SERVICE. OUR TOTAL LIABILITY WILL NOT EXCEED THE AMOUNTS PAID BY YOU FOR THE SERVICE IN THE PERIOD REQUIRED BY APPLICABLE LAW (OR A REASONABLE MINIMUM WHERE REQUIRED).",
    ],
  },
  {
    title: "10. Governing Law and Contact",
    body: [
      "These terms are intended to be governed by applicable laws of the jurisdiction in which the Service operator conducts business, unless mandatory local law requires otherwise. Disputes should be raised promptly so they can be resolved in good faith.",
      "For questions or legal notices, contact the Service operator/administrator using the contact details provided in your account or business communications.",
    ],
  },
];

export default function TermsPage() {
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "var(--background)", color: "var(--foreground)", py: { xs: 4, md: 6 } }}>
      <Container maxWidth="md">
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.5, sm: 4 },
            borderRadius: "20px",
            border: "1px solid var(--border)",
            bgcolor: "var(--card)",
          }}
        >
          <Stack spacing={2.5}>
            <Box>
              <Typography sx={{ fontSize: "0.78rem", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted-foreground)" }}>
                Legal
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 900, mt: 0.5 }}>
                Terms of Service
              </Typography>
              <Typography sx={{ mt: 1, color: "var(--muted-foreground)" }}>
                Last updated: {new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
              </Typography>
            </Box>

            <Paper
              variant="outlined"
              sx={{
                p: 1.5,
                borderRadius: "12px",
                borderColor: "color-mix(in srgb, var(--primary) 35%, var(--border))",
                bgcolor: "color-mix(in srgb, var(--primary) 8%, transparent)",
              }}
            >
              <Typography sx={{ fontSize: "0.9rem", color: "var(--foreground)" }}>
                <strong>Important:</strong> This document is a general template provided for product use and does not constitute legal advice. Have a qualified lawyer review and adapt it for your business, jurisdiction, and operations.
              </Typography>
            </Paper>

            <Divider />

            {sections.map((section) => (
              <Box key={section.title}>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
                  {section.title}
                </Typography>
                <Stack spacing={1}>
                  {section.body.map((paragraph) => (
                    <Typography key={paragraph} sx={{ color: "var(--muted-foreground)", lineHeight: 1.75 }}>
                      {paragraph}
                    </Typography>
                  ))}
                </Stack>
              </Box>
            ))}

            <Divider />
            <Typography sx={{ fontSize: "0.9rem", color: "var(--muted-foreground)" }}>
              See also our <Link href="/privacy" style={{ color: "var(--primary)", fontWeight: 700 }}>Privacy Policy</Link>. Return to <Link href="/auth/register" style={{ color: "var(--primary)", fontWeight: 700 }}>registration</Link> or <Link href="/auth/login" style={{ color: "var(--primary)", fontWeight: 700 }}>login</Link>.
            </Typography>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
