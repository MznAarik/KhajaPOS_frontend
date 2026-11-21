import type { Metadata } from "next";
import NotFoundPage from "@/src/components/ui/404";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
    return (
        <NotFoundPage
            title="Page Not Found"
            subtitle="This page does not exist or may have been moved."
            homeText="go back home"
            searchText="return to KhajaPOS"
            errorCode="404"
        />
    );
}
