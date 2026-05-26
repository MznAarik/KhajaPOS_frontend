import RecentOrderClient from "./recent-client";

export default function RecentOrderPage({
  searchParams,
}: {
  searchParams?: { tableCode?: string };
}) {
  return <RecentOrderClient tableCode={searchParams?.tableCode ?? ""} />;
}
