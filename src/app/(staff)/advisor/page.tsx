import { LeadList } from "@/features/leads/lead-list";
export default async function Advisor({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string; level?: string; page?: string; from?: string; to?: string }>;
}) {
  return <LeadList admin={false} query={await searchParams} />;
}
