import { NextResponse, type NextRequest } from "next/server";

const LOGIN_PATH = "/auth/login";

export async function proxy(request: NextRequest) {
  const token = request.cookies.get("authToken")?.value;

  if (!token) {
    const loginUrl = new URL(LOGIN_PATH, request.url);
    const currentPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
    loginUrl.searchParams.set("message", "Session expired! Please log in again.");
    loginUrl.searchParams.set("redirect", currentPath);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
