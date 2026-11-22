import { ApplicationList, type ApplicationQuery } from "@/features/applicants/application-list";
export default async function Page({ searchParams }: { searchParams: Promise<ApplicationQuery> }) {
  return <ApplicationList query={await searchParams} staff />;
}
