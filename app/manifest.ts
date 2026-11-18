import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KhajaPOS — Restaurant POS & Table Ordering",
    short_name: "KhajaPOS",
    description:
      "Modern restaurant POS with QR table ordering, menu management, real-time order tracking, and sales analytics.",
    start_url: "/landing",
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
    ],
  };
}
