import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v13-appRouter";
import { poppins } from "./src/fonts";
import ThemeRegistry from "@/components/common/ThemeRegistry";
import { THEME_INIT_SCRIPT } from "@/components/common/theme-mode";
import { SnackbarProviderCustom } from "@/components/common/SnackBar";
import { Analytics } from "@vercel/analytics/next";
import { SITE_DESCRIPTION, SITE_NAME, SITE_OG_IMAGE, getSiteUrl } from "@/lib/seo";

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "KhajaPOS — POS Software for Restaurants in Nepal",
    template: "%s | KhajaPOS",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "POS software Nepal",
    "restaurant billing software",
    "restaurant POS system",
    "QR table ordering",
    "kitchen display system",
    "menu management software",
    "inventory and billing system",
    "KhajaPOS",
  ],
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME }],
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: "KhajaPOS — POS Software for Restaurants in Nepal",
    description: SITE_DESCRIPTION,
    url: siteUrl,
    locale: "en_US",
    images: [
      {
        url: SITE_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "KhajaPOS — Restaurant POS and billing software in Nepal",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "KhajaPOS — POS Software for Restaurants in Nepal",
    description: SITE_DESCRIPTION,
    images: [SITE_OG_IMAGE],
  },
  robots: { index: true, follow: true },
  icons: {
    icon: "/images.png", // TODO: replace with dedicated /favicon.ico
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf6f0" },
    { media: "(prefers-color-scheme: dark)", color: "#080f0b" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={poppins.variable} suppressHydrationWarning>
      <body className={poppins.className}>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <AppRouterCacheProvider>
          <ThemeRegistry>
            <SnackbarProviderCustom>
              {children}
              <Analytics />
            </SnackbarProviderCustom>
          </ThemeRegistry>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
