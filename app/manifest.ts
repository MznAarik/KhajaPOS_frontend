import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KhajaPOS — Restaurant POS & Billing Software",
    short_name: "KhajaPOS",
    description:
      "KhajaPOS is POS and billing software for restaurants in Nepal with QR table ordering, menus, live orders, and analytics.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0b0f14",
    categories: ["business", "food", "productivity"],
    icons: [
      {
        src: "/images.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/images.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      // TODO: add /apple-touch-icon.png and 1200x630 /og-image.png in /public
    ],
  };
}
