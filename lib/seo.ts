export const SITE_NAME = "KhajaPOS";
export const SITE_URL_DEFAULT = "https://khaja-pos.vercel.app";
export const SITE_DESCRIPTION =
  "KhajaPOS is restaurant POS and billing software in Nepal with QR table ordering, menu management, live orders, and sales analytics.";
export const SITE_OG_IMAGE = "/og-image.png"; // TODO: add 1200x630 branded OG image in /public

export function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? SITE_URL_DEFAULT).replace(/\/+$/, "");
}

export function absoluteUrl(path = "/") {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${getSiteUrl()}${normalized}`;
}

export function getApiOrigin() {
  return (process.env.API_ORIGIN ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000")
    .replace(/\/api\/?$/i, "")
    .replace(/\/+$/, "");
}

export async function fetchPublicJson<T>(
  path: string,
  init?: RequestInit & { next?: { revalidate?: number } },
): Promise<T | null> {
  const origin = getApiOrigin();
  if (!origin) return null;
  const url = `${origin}${path.startsWith("/") ? path : `/${path}`}`;
  try {
    const res = await fetch(url, {
      ...init,
      headers: { Accept: "application/json", ...(init?.headers ?? {}) },
      next: init?.next ?? { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
