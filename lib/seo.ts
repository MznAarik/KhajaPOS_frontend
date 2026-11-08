export function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

export function getApiOrigin() {
  return (process.env.API_ORIGIN ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000")
    .replace(/\/api\/?$/i, "")
    .replace(/\/+$/, "");
}

export async function fetchPublicJson<T>(path: string, init?: RequestInit & { next?: { revalidate?: number } }): Promise<T | null> {
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
