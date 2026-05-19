import { cookies } from "next/headers";

export const getTokenFromCookies = async (): Promise<string | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get("authToken");
  return token?.value ?? null;
};
