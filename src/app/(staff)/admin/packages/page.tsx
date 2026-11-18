import Link from "next/link";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/session";
import { Workspace } from "@/components/layout/workspace";
import { PackageEditor, type ServicePackage } from "@/features/admin/opportunity-editor";
export default async function Packages({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; edit?: string }>;
}) {
  const { db, user, role } = await requireStaff(true);
  const q = await searchParams;
  const page = Math.max(1, Math.min(100000, Number.parseInt(q.page || "1", 10) || 1));
  const list = await db
    .from("service_packages")
    .select("*", { count: "exact" })
    .order("updated_at", { ascending: false })
    .order("id")
    .range((page - 1) * 20, page * 20 - 1);
  if (list.error) throw Error("Packages unavailable");
  const edit =
    q.edit && z.uuid().safeParse(q.edit).success
      ? await db.from("service_packages").select("*").eq("id", q.edit).maybeSingle()
      : null;
  if (edit?.error) throw Error("Package unavailable");
  return (
    <Workspace role={role} email={user.email || ""} active="packages">
      <h1>ISG service packages.</h1>
      <p>
        Publish approved ISG prices and scope. The consultation fee is included once; provider and university
        charges remain separate.
      </p>
      <div className="operation-grid">
        <section className="workspace-panel">
          <h2>{edit?.data ? "Edit package" : "Add package"}</h2>
          {edit?.data && (
            <Link className="text-link" href="/admin/packages">
              Add another →
            </Link>
          )}
          <PackageEditor value={edit?.data as ServicePackage | undefined} />
        </section>
        <section className="workspace-panel">
          <h2>Package prices</h2>
          {!list.data?.length ? (
            <p>No service packages yet. Add the approved service scope and prices.</p>
          ) : (
            <ul className="notification-history">
              {(list.data as ServicePackage[]).map((p) => (
                <li key={p.id}>
                  <strong>{p.name}</strong>
                  <p>
                    TZS {p.price_tzs.toLocaleString("en")} · {p.active ? "Active" : "Archived"} ·{" "}
                    {p.promoted ? "Public" : "Unpublished"}
                  </p>
                  <Link className="text-link" href={`/admin/packages?edit=${p.id}&page=${page}`}>
                    Edit package →
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="pagination">
            {page > 1 && <Link href={`/admin/packages?page=${page - 1}`}>← Previous</Link>}
            {page * 20 < (list.count || 0) && <Link href={`/admin/packages?page=${page + 1}`}>Next →</Link>}
          </div>
        </section>
      </div>
    </Workspace>
  );
}
