import { LeadList } from "@/features/leads/lead-list";
export default async function Admin({
  searchParams,
}: {
  searchParams: Promise<{
    stage?: string;
    level?: string;
    page?: string;
    advisor?: string;
    from?: string;
    to?: string;
  }>;
}) {
  return <LeadList admin query={await searchParams} />;
}
