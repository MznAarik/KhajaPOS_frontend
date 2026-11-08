import type { MetadataRoute } from "next";
import { fetchPublicJson, getSiteUrl } from "@/lib/seo";

export const revalidate = 1800;

type PublicBusinessesResponse = {
  status?: number;
  data?: Array<{ id: number; updated_at?: string | null }>;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const now = new Date();

  const base: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/landing`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/auth/login`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/auth/register`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
  ];

  const json = await fetchPublicJson<PublicBusinessesResponse>("/api/public/businesses?limit=500", {
    next: { revalidate: 1800 },
  });
  const businesses = json?.status === 1 && Array.isArray(json.data) ? json.data : [];

  const businessEntries: MetadataRoute.Sitemap = businesses
    .filter((b) => Number.isFinite(b?.id))
    .map((b) => ({
      url: `${siteUrl}/business/${b.id}`,
      lastModified: b.updated_at ? new Date(b.updated_at) : now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

  return [...base, ...businessEntries];
}
