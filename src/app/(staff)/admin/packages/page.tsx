import Link from "next/link";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/session";
import { Workspace } from "@/components/layout/workspace";
import { DeleteForm } from "@/components/forms/delete-form";
import { ScholarshipPackageEditor } from "@/features/admin/scholarship-package-editor";
import { deleteScholarshipPackage } from "@/features/admin/scholarship-package-actions";
import type { ScholarshipPackage } from "@/lib/validation/opportunities";
import { usdLabel } from "@/lib/format";

export default async function ScholarshipPackages({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; edit?: string; created?: string }>;
}) {
  const { db, user, role } = await requireStaff(true);
  const query = await searchParams;
  const page = Math.max(1, Math.min(100000, Number.parseInt(query.page || "1", 10) || 1));
  const [list, edit] = await Promise.all([
    db.rpc("admin_opportunities", {}, { count: "exact" }).range((page - 1) * 20, page * 20 - 1),
    z.uuid().safeParse(query.edit).success
      ? db.rpc("admin_opportunities").eq("id", query.edit).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (list.error || edit.error) throw Error("Scholarship packages unavailable");
  const selected = edit.data as ScholarshipPackage | null;
  return (
    <Workspace role={role} email={user.email || ""} active="packages">
      <h1>Scholarship packages</h1>
      <p>
        Set up the scholarship, ISG support and fees together. Share a package from the applicant’s
        consultation.
      </p>
      <div className="operation-grid scholarship-admin-grid">
        <section className="workspace-panel">
          <h2>{selected ? "Edit package" : "Create a package"}</h2>
          {selected && query.created === "1" && (
            <p role="status" className="form-message">
              Scholarship package created.
            </p>
          )}
          {selected && (
            <Link className="text-link" href="/admin/packages">
              Create a different package →
            </Link>
          )}
          <ScholarshipPackageEditor value={selected || undefined} />
        </section>
        <section className="workspace-panel">
          <h2>Saved packages</h2>
          {!list.data?.length ? (
            <p>Add your first package to start sharing scholarships with applicants.</p>
          ) : (
            <ul className="notification-history">
              {(list.data as ScholarshipPackage[]).map((item) => (
                <li key={item.id}>
                  <strong>{item.name}</strong>
                  <p>
                    {item.provider} · {item.destination}
                  </p>
                  <p>
                    {item.package_fee_tzs === null
                      ? "Add a package fee before sharing"
                      : `TZS ${item.package_fee_tzs.toLocaleString("en")} (${usdLabel(item.package_fee_tzs)}) · ${item.active ? "Available" : "Archived"}`}
                  </p>
                  <div className="row-actions">
                    <Link className="text-link" href={`/admin/packages?edit=${item.id}&page=${page}`}>
                      Edit package →
                    </Link>
                    <DeleteForm
                      action={deleteScholarshipPackage}
                      id={item.id}
                      label="Delete package"
                      confirm={`Delete ${item.name}? This cannot be undone.`}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
          <nav className="pagination" aria-label="Package pages">
            {page > 1 && <Link href={`/admin/packages?page=${page - 1}`}>← Previous</Link>}
            {page * 20 < (list.count || 0) && <Link href={`/admin/packages?page=${page + 1}`}>Next →</Link>}
          </nav>
        </section>
      </div>
    </Workspace>
  );
}
