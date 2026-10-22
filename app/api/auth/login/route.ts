import { NextResponse } from "next/server";

const API_ORIGIN = (
  process.env.API_ORIGIN ??
  process.env.NEXT_PUBLIC_API_URL ??
  ""
)
  .replace(/\/api\/?$/i, "")
  .replace(/\/+$/, "");

const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

const baseCookie = {
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};

export async function POST(request: Request) {
  if (!API_ORIGIN) {
    return NextResponse.json({ message: "API is not configured." }, { status: 500 });
  }

  let body: string;

  try {
    body = await request.text();
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  let upstream: Response;

  try {
    upstream = await fetch(`${API_ORIGIN}/api/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body,
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ message: "Login service is unavailable." }, { status: 502 });
  }

  const payload = await upstream.json().catch(() => null);

  if (!upstream.ok) {
    return NextResponse.json(payload ?? { message: "Login failed." }, { status: upstream.status });
  }

  const token = payload?.data?.access_token;
  const user = payload?.data?.user;

  if (typeof token !== "string" || token.length === 0) {
    return NextResponse.json({ message: "Login failed." }, { status: 502 });
  }

  const response = NextResponse.json({
    status: 1,
    message: payload?.message ?? "Login successful.",
    data: { user },
  });

  response.cookies.set("authToken", token, {
    ...baseCookie,
    httpOnly: true,
    maxAge: SESSION_MAX_AGE,
  });

  response.cookies.set("authSession", "1", {
    ...baseCookie,
    httpOnly: false,
    maxAge: SESSION_MAX_AGE,
  });

  return response;
}
