import { getWorkspaceText } from "@/lib/i18n/server";
import { Suspense } from "react";

import { Text } from "@/lib/i18n/workspace-text";
import Link from "next/link";
import Image from "next/image";
import { Plus } from "lucide-react";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/session";
import { Workspace } from "@/components/layout/workspace";
import { DeleteForm } from "@/components/forms/delete-form";
import { ScholarshipPackageEditor } from "@/features/admin/scholarship-package-editor";
import { deleteScholarshipPackage } from "@/features/admin/scholarship-package-actions";
import type { ScholarshipPackage } from "@/lib/validation/opportunities";
import { usdLabel } from "@/lib/format";
import { CatalogueTabs } from "@/features/admin/catalogue-tabs";
import { ProgrammeCatalogue } from "@/features/admin/programme-catalogue";
import { CatalogueLayout } from "@/features/admin/catalogue-layout";
import { CatalogueLoading, CatalogueUnavailable } from "@/features/admin/catalogue-status";
import type { SupabaseClient } from "@supabase/supabase-js";

export default async function ScholarshipPackages({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ db, user, role }, raw] = await Promise.all([requireStaff(true), searchParams]);
  const query = Object.fromEntries(
    Object.entries(raw).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
  const programmes = query.tab === "programmes";
  return (
    <Workspace role={role} email={user.email || ""} active="packages">
      <h1>
        <Text>Scholar packages and programmes</Text>
      </h1>
      <CatalogueTabs programmes={programmes} />
      <Suspense key={`${programmes}:${query.edit || ""}`} fallback={<CatalogueLoading />}>
        {programmes ? (
          <ProgrammeCatalogue db={db} query={query} />
        ) : (
          <PackageCatalogue db={db} query={query} />
        )}
      </Suspense>
    </Workspace>
  );
}

async function PackageCatalogue({ db, query }: { db: SupabaseClient; query: Record<string, string> }) {
  const translate = await getWorkspaceText();
  const page = Math.max(1, Math.min(100000, Number.parseInt(query.page || "1", 10) || 1));
  const editing = z.uuid().safeParse(query.edit).success;
  const [list, edit] = await Promise.all([
    db
      .rpc("admin_opportunities", {}, { count: "exact" })
      .range((page - 1) * 20, page * 20 - 1)
      .abortSignal(AbortSignal.timeout(8000)),
    editing
      ? db
          .rpc("admin_opportunities")
          .eq("id", query.edit)
          .abortSignal(AbortSignal.timeout(8000))
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (list.error || edit.error || (editing && !edit.data))
    return <CatalogueUnavailable href="/admin/packages" />;
  const selected = edit.data as ScholarshipPackage | null;
  return (
    <CatalogueLayout
      key={selected?.id || "new-package"}
      label={selected ? "Edit package" : "New package"}
      editing={Boolean(selected)}
      editor={
        <>
          <h2>{selected ? translate("Edit package") : translate("Create a package")}</h2>
          {selected && query.created === "1" && (
            <p role="status" className="form-message">
              <Text>{"Scholarship package created."}</Text>
            </p>
          )}
          {selected && (
            <Link className="text-link" href="/admin/packages">
              <Text>{"Create a different package →"}</Text>
            </Link>
          )}
          <Suspense fallback={<CatalogueLoading />}>
            <ScholarshipPackageEditor value={selected || undefined} />
          </Suspense>
        </>
      }
    >
      <section className="workspace-panel">
        <div className="panel-head">
          <h2>
            <Text>{"Saved packages"}</Text>
          </h2>
          <Link className="button button-outline catalogue-desktop-action" href="/admin/packages">
            <Plus size={16} />
            <Text>{"New package"}</Text>
          </Link>
        </div>
        {!list.data?.length ? (
          <p>
            <Text>{"Add your first package to start sharing scholarships with applicants."}</Text>
          </p>
        ) : (
          <ul className="notification-history">
            {(list.data as ScholarshipPackage[]).map((item) => (
              <li key={item.id}>
                <div className="package-row">
                  {item.image && (
                    <Image
                      className="package-row-thumb"
                      src={item.image}
                      alt=""
                      width={96}
                      height={64}
                      unoptimized
                    />
                  )}
                  <div>
                    <strong>{item.name}</strong>
                    <p>
                      {item.provider} · {item.destination}
                    </p>
                    <p>
                      {item.package_fee_tzs === null
                        ? "Add a package fee before sharing"
                        : `TZS ${item.package_fee_tzs.toLocaleString("en")} (${usdLabel(item.package_fee_tzs)}) · ${item.active ? "Available" : "Archived"}`}
                    </p>
                  </div>
                </div>
                <div className="row-actions">
                  <Link
                    className="text-link"
                    scroll={false}
                    href={`/admin/packages?edit=${item.id}&page=${page}`}
                  >
                    <Text>{"Edit package →"}</Text>
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
        <nav className="pagination" aria-label={translate("Package pages")}>
          {page > 1 && (
            <Link href={`/admin/packages?page=${page - 1}`}>
              <Text>{"← Previous"}</Text>
            </Link>
          )}
          {page * 20 < (list.count || 0) && (
            <Link href={`/admin/packages?page=${page + 1}`}>
              <Text>{"Next →"}</Text>
            </Link>
          )}
        </nav>
      </section>
    </CatalogueLayout>
  );
}
