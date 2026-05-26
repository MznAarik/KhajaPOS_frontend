import RecentOrderClient from "./recent-client";

export default function RecentOrderPage({
  searchParams,
}: {
  searchParams?: { tableCode?: string | string[] };
}) {
  const tableCode = Array.isArray(searchParams?.tableCode)
    ? searchParams?.tableCode[0] ?? ""
    : searchParams?.tableCode ?? "";

  return <RecentOrderClient tableCode={tableCode} />;
}
