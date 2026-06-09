import RecentOrderClient from "./recent-client";

export default async function RecentOrderPage({
  searchParams,
}: {
  searchParams?: Promise<{ tableCode?: string | string[] }>;
}) {
  const resolvedSearchParams = await searchParams;
  const tableCode = Array.isArray(resolvedSearchParams?.tableCode)
    ? resolvedSearchParams?.tableCode[0] ?? ""
    : resolvedSearchParams?.tableCode ?? "";

  return <RecentOrderClient tableCode={tableCode} />;
}
