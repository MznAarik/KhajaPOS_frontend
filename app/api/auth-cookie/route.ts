import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = (await req.json()) as { token?: string };
  const token = body.token;

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("authToken", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24,
  });

  return res;
}
