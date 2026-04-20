import ThemeRegistry from "@/components/common/ThemeRegistry";
import SideNavLayout from "./sideNavLayout";
import { getTokenFromCookies } from "@/lib/api-server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const token = await getTokenFromCookies();

    if (!token) {
        redirect("/auth");
    }
    return (
        <ThemeRegistry>
            <SideNavLayout>
                {children}
            </SideNavLayout>
        </ThemeRegistry>
    );
}
