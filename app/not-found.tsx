import NotFoundPage from "@/src/components/ui/404";

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
