import ThemeRegistry from "@/components/common/ThemeRegistry";
import SideNavLayout from "./sideNavLayout";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <ThemeRegistry>
            <SideNavLayout>
                {children}
            </SideNavLayout>
        </ThemeRegistry>
    );
}
    