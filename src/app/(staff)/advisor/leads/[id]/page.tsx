import { LeadDetail } from "@/features/leads/lead-detail";
export default async function Detail({ params }: { params: Promise<{ id: string }> }) {
  return <LeadDetail admin={false} id={(await params).id} />;
}
