import { LeadList } from "@/features/leads/lead-list";
type Query = { stage?: string; level?: string; page?: string; advisor?: string; from?: string; to?: string };
export default async function Consultations({ searchParams }: { searchParams: Promise<Query> }) {
  return <LeadList admin query={await searchParams} />;
}
