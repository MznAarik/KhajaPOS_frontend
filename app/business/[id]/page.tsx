import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import PlaceRoundedIcon from "@mui/icons-material/PlaceRounded";
import PhoneRoundedIcon from "@mui/icons-material/PhoneRounded";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import { fetchPublicJson, getSiteUrl } from "@/lib/seo";

type BusinessProfile = {
  id: number;
  name: string;
  logo?: string | null;
  address?: string | null;
  email?: string | null;
  phone?: string | null;
  updated_at?: string | null;
};

type PublicBusinessResponse = {
  status?: number;
  data?: BusinessProfile;
};

async function getBusiness(id: string): Promise<BusinessProfile | null> {
  if (!/^\d+$/.test(id)) return null;
  const json = await fetchPublicJson<PublicBusinessResponse>(`/api/public/businesses/${id}`, {
    next: { revalidate: 1800 },
  });
  if (!json || json.status !== 1 || !json.data?.id) return null;
  return json.data;
}

function resolveLogo(logo?: string | null) {
  if (!logo) return null;
  if (/^https?:\/\//i.test(logo)) return logo;
  const origin = (process.env.NEXT_PUBLIC_API_URL ?? process.env.API_ORIGIN ?? "http://127.0.0.1:8000")
    .replace(/\/api\/?$/i, "")
    .replace(/\/+$/, "");
  if (logo.startsWith("/")) return `${origin}${logo}`;
  return `${origin}/storage/${logo.replace(/^\/+/, "")}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const business = await getBusiness(id);
  const siteUrl = getSiteUrl();
  if (!business) {
    return {
      title: "Business profile | KhajaPOS",
      robots: { index: false, follow: false },
    };
  }

  const title = `${business.name} | KhajaPOS`;
  const description = business.address
    ? `${business.name} uses KhajaPOS for QR table ordering and service operations. Located at ${business.address}.`
    : `${business.name} uses KhajaPOS for QR table ordering, menu browsing, and service operations.`;
  const url = `${siteUrl}/business/${business.id}`;
  const image = resolveLogo(business.logo);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      title,
      description,
      siteName: "KhajaPOS",
      ...(image ? { images: [{ url: image, alt: `${business.name} logo` }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
    robots: { index: true, follow: true },
  };
}

export default async function BusinessProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const business = await getBusiness(id);
  if (!business) notFound();

  const siteUrl = getSiteUrl();
  const logoUrl = resolveLogo(business.logo);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: business.name,
    url: `${siteUrl}/business/${business.id}`,
    ...(logoUrl ? { image: logoUrl, logo: logoUrl } : {}),
    ...(business.address ? { address: { "@type": "PostalAddress", streetAddress: business.address } } : {}),
    ...(business.phone ? { telephone: business.phone } : {}),
    ...(business.email ? { email: business.email } : {}),
  };

  return (
    <Box sx={{ minHeight: "100dvh", backgroundColor: "var(--background)", backgroundImage: "var(--page-gradient)", color: "var(--foreground)" }}>
      <Container maxWidth="md" sx={{ py: { xs: 3, md: 6 } }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.25, sm: 3, md: 4 },
            borderRadius: { xs: "22px", md: "28px" },
            border: "1px solid var(--border)",
            backgroundColor: "color-mix(in srgb, var(--card) 92%, transparent)",
            backgroundImage: "var(--surface-gradient)",
            boxShadow: "var(--soft-shadow)",
          }}
        >
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "flex-start", sm: "center" }}>
            <Box
              sx={{
                width: { xs: 72, sm: 84 },
                height: { xs: 72, sm: 84 },
                borderRadius: "20px",
                overflow: "hidden",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
                border: "1px solid var(--border)",
                background: "linear-gradient(135deg, color-mix(in srgb, var(--primary) 14%, var(--card)), var(--muted))",
              }}
            >
              {logoUrl ? (
                <Box component="img" src={logoUrl} alt={business.name} sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <StorefrontRoundedIcon sx={{ fontSize: 36, color: "var(--primary)" }} />
              )}
            </Box>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Chip
                label="Business profile"
                size="small"
                sx={{
                  mb: 1,
                  fontWeight: 850,
                  color: "var(--primary)",
                  backgroundColor: "color-mix(in srgb, var(--primary) 12%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--primary) 22%, transparent)",
                }}
              />
              <Typography component="h1" sx={{ fontSize: { xs: "1.7rem", md: "2.2rem" }, fontWeight: 950, lineHeight: 1.1, overflowWrap: "anywhere" }}>
                {business.name}
              </Typography>
              <Typography sx={{ mt: 0.75, color: "var(--muted-foreground)", lineHeight: 1.65 }}>
                This business uses KhajaPOS for QR table ordering and service operations.
              </Typography>
            </Box>
          </Stack>

          <Divider sx={{ my: 2.5, borderColor: "color-mix(in srgb, var(--border) 80%, transparent)" }} />

          <Stack spacing={1.25}>
            {business.address ? (
              <Stack direction="row" spacing={1.25} alignItems="flex-start">
                <PlaceRoundedIcon sx={{ color: "var(--primary)", mt: 0.1 }} fontSize="small" />
                <Typography sx={{ lineHeight: 1.6 }}>{business.address}</Typography>
              </Stack>
            ) : null}
            {business.phone ? (
              <Stack direction="row" spacing={1.25} alignItems="center">
                <PhoneRoundedIcon sx={{ color: "var(--primary)" }} fontSize="small" />
                <Typography sx={{ lineHeight: 1.6 }}>{business.phone}</Typography>
              </Stack>
            ) : null}
            {business.email ? (
              <Stack direction="row" spacing={1.25} alignItems="center">
                <EmailRoundedIcon sx={{ color: "var(--primary)" }} fontSize="small" />
                <Typography sx={{ lineHeight: 1.6, overflowWrap: "anywhere" }}>{business.email}</Typography>
              </Stack>
            ) : null}
            {!business.address && !business.phone && !business.email ? (
              <Typography sx={{ color: "var(--muted-foreground)", lineHeight: 1.6 }}>
                Contact details are not publicly listed for this business.
              </Typography>
            ) : null}
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 3 }}>
            <Button component={Link} href="/landing" variant="outlined" sx={{ minHeight: 44, borderRadius: "12px", fontWeight: 850, textTransform: "none" }}>
              About KhajaPOS
            </Button>
            <Button component={Link} href="/auth/login" variant="contained" sx={{ minHeight: 44, borderRadius: "12px", fontWeight: 900, textTransform: "none" }}>
              Sign in
            </Button>
          </Stack>
        </Paper>

        <Box component="footer" sx={{ mt: 2, textAlign: "center" }}>
          <Typography sx={{ color: "var(--muted-foreground)", fontSize: "0.78rem" }}>
            © {new Date().getFullYear()} KhajaPOS &amp; mzaarik. All rights reserved.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
