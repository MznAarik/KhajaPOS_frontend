import SideNavLayout from "./sideNavLayout";
import { getTokenFromCookies } from "@/lib/api-server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const token = await getTokenFromCookies();

    const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/user`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
        }
    );

    if (!res.ok) {
        redirect("/auth/login");
    }

    return (
        <SideNavLayout>
            {children}
        </SideNavLayout>
    );
}