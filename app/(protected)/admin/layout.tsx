import SideNavLayout from "./sideNavLayout";
import { getTokenFromCookies } from "@/lib/api-server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "");

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const token = await getTokenFromCookies();

    // A present cookie can still hold an expired/invalid token (e.g. after the
    // backend rotated its signing keys). Validate it so we redirect instead of
    // rendering an admin shell that can never load data.
    let unauthorized = !token;

    if (token && API_BASE) {
        try {
            const res = await fetch(`${API_BASE}/user`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                },
                cache: "no-store",
            });

            unauthorized = res.status === 401 || res.status === 403;
        } catch {
            // Network hiccup: let the client-side 401 interceptor handle it
            // rather than logging the user out on a transient failure.
            unauthorized = false;
        }
    }

    if (unauthorized) {
        redirect("/auth/login?message=Session%20expired");
    }

    return (
        <SideNavLayout>
            {children}
        </SideNavLayout>
    );
}
