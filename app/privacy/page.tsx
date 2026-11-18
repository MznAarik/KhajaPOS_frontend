import type { Metadata } from "next";
import Link from "next/link";
import { Box, Container, Divider, Paper, Stack, Typography } from "@mui/material";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for KhajaPOS, including how data is collected, used, and stored.",
  robots: { index: true, follow: true },
};

const sections: Array<{ title: string; body: string[] }> = [
  {
    title: "1. Information We Collect",
    body: [
      "Account and business information: name, email, phone, password credentials (stored securely/hashed where applicable), business name, type, address, logo, and related profile details you provide.",
      "Operational data: menus, categories, items, prices, tables, orders, transactions, staff/user records, notifications, and other content entered into the Service.",
      "Technical and usage data: device/browser information, IP address, logs, timestamps, and usage events needed to operate, secure, and troubleshoot the Service.",
    ],
  },
  {
    title: "2. How We Use Information",
    body: [
      "To provide and operate the Service (including authentication, order/menu management, QR ordering, reporting, and support).",
      "To maintain security, prevent abuse/fraud, debug issues, and improve reliability and features.",
      "To communicate service-related messages (such as verification, account, and operational notifications).",
      "To comply with legal obligations and enforce our Terms of Service.",
    ],
  },
  {
    title: "3. Data Storage and Processing",
    body: [
      "By using KhajaPOS, you acknowledge and consent that your account data, business data, and operational/customer data entered into the platform may be collected, stored, processed, and backed up on systems used to operate the Service (which may include cloud infrastructure and service providers).",
      "We take reasonable measures to protect data; however, no method of transmission or storage is completely secure, and you use the Service with this understanding.",
    ],
  },
  {
    title: "4. Sharing and Disclosure",
    body: [
      "We do not sell your personal data or your business data to anyone, and we do not share your data for third-party advertising or data-brokerage purposes.",
      "We may share data only with trusted service providers who help operate the Service (e.g., hosting, storage, email, analytics, security) under appropriate confidentiality/processing obligations.",
      "If required by applicable law, regulation, court order, legal process, or a valid request from government or law enforcement authorities, we may disclose relevant data as necessary to comply.",
      "We may also disclose information when reasonably necessary to protect the rights, safety, and security of users, the public, or the Service.",
    ],
  },
  {
    title: "5. Retention",
    body: [
      "We retain information for as long as needed to provide the Service, meet legal/accounting obligations, resolve disputes, and enforce agreements. Retention periods may vary by data type and account status.",
    ],
  },
  {
    title: "6. Your Choices and Rights",
    body: [
      "You may access and update certain information in your account. Depending on applicable law, you may have rights to request access, correction, deletion, export, or restriction of processing of personal data.",
      "To make requests, contact the Service operator/administrator. Some data may need to be retained for legal, security, or legitimate operational reasons.",
    ],
  },
  {
    title: "7. Cookies and Sessions",
    body: [
      "The Service may use cookies or similar technologies for authentication, session management, preferences, and security. Disabling them may affect functionality.",
    ],
  },
  {
    title: "8. Changes to This Policy",
    body: [
      "We may update this Privacy Policy from time to time. Continued use of the Service after changes take effect constitutes acceptance of the updated policy where permitted by law.",
    ],
  },
];

export default function PrivacyPage() {
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
                Privacy Policy
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
                <strong>Important:</strong> This document is a general template provided for product use and does not constitute legal advice. Have a qualified lawyer review and adapt it for your business, jurisdiction, and data practices.
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
              See also our <Link href="/terms" style={{ color: "var(--primary)", fontWeight: 700 }}>Terms of Service</Link>. Return to <Link href="/auth/register" style={{ color: "var(--primary)", fontWeight: 700 }}>registration</Link> or <Link href="/auth/login" style={{ color: "var(--primary)", fontWeight: 700 }}>login</Link>.
            </Typography>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
