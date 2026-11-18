import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/session";
import { Workspace } from "@/components/layout/workspace";

export default async function Declaration({ params }: { params: Promise<{ id: string }> }) {
  const { db, user, role } = await requireStaff(true);
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const { data: declaration, error } = await db
    .from("application_declarations")
    .select("id,user_id,version,accepted_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw Error("Application declaration unavailable");
  if (!declaration) notFound();
  return (
    <Workspace role={role} email={user.email || ""}>
      <h1>Accepted application declaration.</h1>
      <section className="workspace-panel">
        <h2>Immutable submitted copy</h2>
        <p>
          Accepted {new Date(declaration.accepted_at).toISOString()} · {declaration.version}
        </p>
        <p>This copy records the answers accepted at this time. Later submissions do not change it.</p>
        <div className="workspace-action-row">
          <Link className="text-link" href={`/api/application-pdf/${declaration.id}`}>
            Download accepted application PDF
          </Link>
          <Link className="text-link" href={`/admin/cases/${declaration.user_id}`}>
            View applicant’s consultation case
          </Link>
        </div>
      </section>
    </Workspace>
  );
}
