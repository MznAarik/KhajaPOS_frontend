import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const API_ORIGIN = (
  process.env.API_ORIGIN ??
  process.env.NEXT_PUBLIC_API_URL ??
  ""
)
  .replace(/\/api\/?$/i, "")
  .replace(/\/+$/, "");

const clearedCookie = {
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 0,
};

export async function DELETE() {
  const cookieStore = await cookies();
  const token = cookieStore.get("authToken")?.value;

  if (token && API_ORIGIN) {
    try {
      await fetch(`${API_ORIGIN}/api/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        cache: "no-store",
      });
    } catch {
      // Best-effort revocation; the cookie is cleared either way.
    }
  }

  const response = NextResponse.json({ status: 1, message: "Logged out successfully!" });
  response.cookies.set("authToken", "", { ...clearedCookie, httpOnly: true });
  response.cookies.set("authSession", "", { ...clearedCookie, httpOnly: false });

  return response;
}
