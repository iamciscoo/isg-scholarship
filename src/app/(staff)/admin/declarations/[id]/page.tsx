import { ApplicationReview } from "@/features/applicants/application-review";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return ApplicationReview({ id: (await params).id, admin: true });
}
