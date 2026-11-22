import { ApplicationOverview } from "@/features/applicants/application-overview";
import type { ApplicationQuery } from "@/features/applicants/application-list";
export default async function Page({ searchParams }: { searchParams: Promise<ApplicationQuery> }) {
  return <ApplicationOverview query={await searchParams} />;
}
