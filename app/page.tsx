import type { Metadata } from "next";
import MarketingHome from "@/components/marketing/MarketingHome";
import { SITE_DESCRIPTION, SITE_NAME, SITE_OG_IMAGE, getSiteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Restaurant POS & Billing Software in Nepal",
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    title: "KhajaPOS — Restaurant POS & Billing Software in Nepal",
    description: SITE_DESCRIPTION,
    siteName: SITE_NAME,
    images: [{ url: SITE_OG_IMAGE, width: 1200, height: 630, alt: "KhajaPOS — Restaurant POS and billing software in Nepal" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "KhajaPOS — Restaurant POS & Billing Software in Nepal",
    description: SITE_DESCRIPTION,
    images: [SITE_OG_IMAGE],
  },
  robots: { index: true, follow: true },
};

export default function HomePage() {
  const siteUrl = getSiteUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: SITE_NAME,
        url: siteUrl,
        logo: `${siteUrl}/images.png`,
        // TODO: add sameAs social links, contactPoint phone/email when confirmed
      },
      {
        "@type": "WebSite",
        name: SITE_NAME,
        url: siteUrl,
        description: SITE_DESCRIPTION,
      },
      {
        "@type": "SoftwareApplication",
        name: SITE_NAME,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        description:
          "Restaurant POS and billing software with QR table ordering, menu management, live orders, and analytics.",
        url: siteUrl,
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "What is KhajaPOS?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "KhajaPOS is a restaurant POS and billing software platform that helps food businesses manage QR table ordering, menus, tables, live orders, and operations.",
            },
          },
          {
            "@type": "Question",
            name: "Does KhajaPOS support QR table ordering?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. Guests can scan a table code, browse the menu, and place orders from their own device.",
            },
          },
          {
            "@type": "Question",
            name: "Can I manage menus, tables, and orders in one place?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. KhajaPOS includes admin tools for menu and table management, live order operations, and business visibility.",
            },
          },
          {
            "@type": "Question",
            name: "Is KhajaPOS suitable for restaurants in Nepal?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "KhajaPOS is built for restaurants, cafés, and food businesses looking for a modern POS and table ordering workflow, including teams operating in Nepal.",
            },
          },
        ],
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <MarketingHome />
    </>
  );
}