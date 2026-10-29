import { NextResponse, type NextRequest } from "next/server";

const API_ORIGIN = (
  process.env.API_ORIGIN ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://127.0.0.1:8000"
)
  .replace(/\/api\/?$/i, "")
  .replace(/\/+$/, "");

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function proxy(request: NextRequest) {
  const { pathname, origin } = request.nextUrl;

  if (UNSAFE_METHODS.has(request.method)) {
    const requestOrigin = request.headers.get("origin");

    if (requestOrigin && requestOrigin !== origin) {
      return NextResponse.json({ message: "Invalid request origin." }, { status: 403 });
    }
  }

  const isApiProxy = pathname === "/api/svc" || pathname.startsWith("/api/svc/");
  const isMedia = pathname.startsWith("/media/");

  if (!isApiProxy && !isMedia) {
    return NextResponse.next();
  }

  if (isMedia && request.method !== "GET" && request.method !== "HEAD") {
    return NextResponse.json({ message: "Method not allowed." }, { status: 405 });
  }

  if (!API_ORIGIN) {
    return NextResponse.json({ message: "API is not configured." }, { status: 500 });
  }

  const target = new URL(API_ORIGIN);
  target.pathname = isApiProxy
    ? pathname.replace(/^\/api\/svc/, "/api")
    : pathname.replace(/^\/media/, "/storage");
  target.search = request.nextUrl.search;

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("cookie");
  headers.delete("authorization");
  headers.set("host", target.host);

  const token = request.cookies.get("authToken")?.value;

  if (token) {
    headers.set("authorization", `Bearer ${token}`);
  }

  return NextResponse.rewrite(target, { request: { headers } });
}

export const config = {
  matcher: ["/api/svc/:path*", "/media/:path*", "/api/auth/:path*"],
};
