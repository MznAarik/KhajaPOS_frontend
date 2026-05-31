import type { Metadata } from "next";
import "./globals.css";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v13-appRouter";
import { poppins } from "./src/fonts";
import ThemeRegistry from "@/components/common/ThemeRegistry";
import { SnackbarProviderCustom } from "@/components/common/SnackBar";
import { Analytics } from "@vercel/analytics/next"
export const metadata: Metadata = {
  title: "KhajaPOS",
  description: "Restaurant and POS management dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={poppins.variable}>
      <body className={poppins.className}>
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
