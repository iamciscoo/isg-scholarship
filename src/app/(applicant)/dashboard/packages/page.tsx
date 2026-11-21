import { requireUser } from "@/lib/auth/session";
import { Workspace } from "@/components/layout/workspace";
import { PackageCatalogue } from "@/features/applicants/package-catalogue";

export const metadata = { title: "Scholarship packages" };

export default async function Packages() {
  const { user, role } = await requireUser();
  return (
    <Workspace role={role} email={user.email || ""} active="packages">
      <h1>Scholarship packages.</h1>
      <PackageCatalogue applicant={user.id} />
    </Workspace>
  );
}