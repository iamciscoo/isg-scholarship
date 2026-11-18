import Link from "next/link";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/session";
import { Workspace } from "@/components/layout/workspace";
import { OpportunityEditor } from "@/features/admin/opportunity-editor";
import type { Opportunity } from "@/lib/validation/opportunities";
export default async function Opportunities({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; edit?: string }>;
}) {
  const { db, user, role } = await requireStaff(true);
  const q = await searchParams;
  const page = Math.max(1, Math.min(100000, Number.parseInt(q.page || "1", 10) || 1));
  const list = await db
    .rpc("admin_opportunities", {}, { count: "exact" })
    .range((page - 1) * 20, page * 20 - 1);
  if (list.error) throw Error("Private opportunities unavailable");
  let selected: Opportunity | undefined;
  if (q.edit && z.uuid().safeParse(q.edit).success) {
    const edit = await db.rpc("admin_opportunities").eq("id", q.edit).maybeSingle();
    if (edit.error) throw Error("Opportunity unavailable");
    selected = edit.data as Opportunity | undefined;
  }
  return (
    <Workspace role={role} email={user.email || ""} active="opportunities">
      <h1>Private opportunities.</h1>
      <p>
        Keep actual scholarship and provider names, requirements, source links and deadlines here. Public
        promotions are authored separately.
      </p>
      <div className="operation-grid">
        <section className="workspace-panel">
          <h2>{selected ? "Edit opportunity" : "Add opportunity"}</h2>
          {selected && (
            <Link className="text-link" href="/admin/opportunities">
              Add a different opportunity →
            </Link>
          )}
          <OpportunityEditor value={selected} />
        </section>
        <section className="workspace-panel">
          <h2>Research catalogue</h2>
          {!list.data?.length ? (
            <p>
              No opportunities yet. Add current, source-checked research for your advisors.
            </p>
          ) : (
            <ul className="notification-history">
              {(list.data as Opportunity[]).map((o) => (
                <li key={o.id}>
                  <strong>{o.name}</strong>
                  <p>
                    {o.provider} · {o.destination} · {o.study_level}
                  </p>
                  <p>
                    {o.active ? "Active" : "Archived"} · Deadline: {o.deadline || "Not confirmed"}
                  </p>
                  <Link className="text-link" href={`/admin/opportunities?edit=${o.id}&page=${page}`}>
                    Edit private record →
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="pagination">
            {page > 1 && <Link href={`/admin/opportunities?page=${page - 1}`}>← Previous</Link>}
            {page * 20 < (list.count || 0) && (
              <Link href={`/admin/opportunities?page=${page + 1}`}>Next →</Link>
            )}
          </div>
        </section>
      </div>
    </Workspace>
  );
}
