import { NextResponse, type NextRequest } from "next/server";

const LOGIN_PATH = "/auth/login";

const buildLoginRedirect = (request: NextRequest) => {
  const loginUrl = new URL(LOGIN_PATH, request.url);
  const currentPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;

  loginUrl.searchParams.set("message", "Session expired! Please log in again.");
  loginUrl.searchParams.set("redirect", currentPath);

  return NextResponse.redirect(loginUrl);
};

export async function proxy(request: NextRequest) {
  const token = request.cookies.get("authToken")?.value;

  if (!token) {
    return buildLoginRedirect(request);
  }

  const apiBase = process.env.NEXT_PUBLIC_API_URL;

  if (!apiBase) {
    return buildLoginRedirect(request);
  }

  try {
    const response = await fetch(`${apiBase}/user`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return buildLoginRedirect(request);
    }
  } catch {
    return buildLoginRedirect(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
