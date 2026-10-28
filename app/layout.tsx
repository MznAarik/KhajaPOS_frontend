import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v13-appRouter";
import { poppins } from "./src/fonts";
import ThemeRegistry from "@/components/common/ThemeRegistry";
import { THEME_INIT_SCRIPT } from "@/components/common/theme-mode";
import { SnackbarProviderCustom } from "@/components/common/SnackBar";
import { Analytics } from "@vercel/analytics/next"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const SITE_DESCRIPTION =
  "KhajaPOS is a modern restaurant POS system with QR table ordering, kitchen display, menu management, real-time order tracking and sales analytics.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "KhajaPOS — Restaurant POS & Table Ordering System",
    template: "%s | KhajaPOS",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "restaurant POS system",
    "POS for restaurants",
    "table ordering system",
    "QR code ordering",
    "kitchen display system",
    "menu management software",
    "billing and invoicing",
    "sales analytics POS",
    "KhajaPOS",
  ],
  applicationName: "KhajaPOS",
  authors: [{ name: "KhajaPOS" }],
  openGraph: {
    type: "website",
    siteName: "KhajaPOS",
    title: "KhajaPOS — Restaurant POS & Table Ordering System",
    description: SITE_DESCRIPTION,
    url: SITE_URL,
  },
  twitter: {
    card: "summary",
    title: "KhajaPOS — Restaurant POS & Table Ordering System",
    description: SITE_DESCRIPTION,
  },
  robots: { index: true, follow: true },
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
