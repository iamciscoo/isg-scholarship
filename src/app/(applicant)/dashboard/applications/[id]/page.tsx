import { ApplicationDetail } from "@/features/applicants/application-detail";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  return <ApplicationDetail id={(await params).id} historyPage={Number((await searchParams).page) || 1} />;
}
