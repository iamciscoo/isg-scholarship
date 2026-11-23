import Link from "next/link";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Text } from "@/lib/i18n/workspace-text";
import { getWorkspaceText } from "@/lib/i18n/server";
import { ProgrammeEditor } from "./opportunity-editor";
import { DeleteForm } from "@/components/forms/delete-form";
import { deletePromotion } from "./opportunity-actions";
import { DestinationFlag } from "@/features/consultations/destination-select";
import type { Programme } from "@/lib/programmes";

export async function ProgrammeCatalogue({
  db,
  query,
}: {
  db: SupabaseClient;
  query: { page?: string; edit?: string; q?: string };
}) {
  const t = await getWorkspaceText();
  const requestedPage = Math.max(1, Math.min(100000, Number.parseInt(query.page || "1", 10) || 1));
  const search = (query.q || "").slice(0, 100).replace(/[%_\\]/g, "");
  let countRequest = db.from("study_promotions").select("id", { count: "exact", head: true });
  if (search) countRequest = countRequest.ilike("title", `%${search}%`);
  const total = await countRequest;
  if (total.error) throw Error("Programmes unavailable");
  const pages = Math.max(1, Math.ceil((total.count || 0) / 20));
  const page = Math.min(requestedPage, pages);
  let request = db
    .from("study_promotions")
    .select("*")
    .order("title")
    .order("id")
    .range((page - 1) * 20, page * 20 - 1);
  if (search) request = request.ilike("title", `%${search}%`);
  const [list, edit] = await Promise.all([
    request,
    z.uuid().safeParse(query.edit).success
      ? db.from("study_promotions").select("*").eq("id", query.edit).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (list.error || edit.error) throw Error("Programmes unavailable");
  const value = edit.data as Programme | undefined;
  const href = (next: number, id?: string) =>
    `/admin/packages?${new URLSearchParams({ tab: "programmes", page: String(next), ...(search ? { q: search } : {}), ...(id ? { edit: id } : {}) })}`;
  return (
    <div className="operation-grid programme-admin-grid">
      <section className="workspace-panel programme-editor-panel">
        <div className="panel-head">
          <h2>{t(value ? "Edit programme" : "Add programme")}</h2>
          {value && (
            <Link href="/admin/packages?tab=programmes" className="text-link">
              <Text>New programme</Text> →
            </Link>
          )}
        </div>
        <ProgrammeEditor value={value} />
      </section>
      <section className="workspace-panel">
        <div className="panel-head">
          <h2>
            <Text>Programme options</Text>
          </h2>
          <span className="badge">{total.count || 0}</span>
        </div>
        <form method="get" action="/admin/packages" className="programme-search">
          <input type="hidden" name="tab" value="programmes" />
          <label>
            <Text>Search programmes</Text>
            <input name="q" type="search" defaultValue={query.q || ""} maxLength={100} />
          </label>
          <button className="button button-outline">
            <Text>Search</Text>
          </button>
        </form>
        {!list.data?.length && (
          <p role="status">
            <Text>No programmes match these filters.</Text>
          </p>
        )}
        <ul className="programme-admin-list">
          {(list.data as Programme[]).map((p, index) => (
            <li key={p.id}>
              <div className="panel-head">
                <span className="programme-number">{(page - 1) * 20 + index + 1}</span>
                <span className="badge">{t(p.published ? "Available" : "Unpublished")}</span>
              </div>
              <h3>
                <Link href={href(page, p.id)}>{p.title}</Link>
              </h3>
              <p>
                {t(p.study_level)} · {t(p.field)}
              </p>
              <div className="programme-country-chips">
                {p.destinations.map((name) => (
                  <span key={name}>
                    <DestinationFlag name={name} />
                    {name}
                  </span>
                ))}
              </div>
              <div className="row-actions">
                <Link className="button button-outline button-sm" href={href(page, p.id)}>
                  <Text>Edit programme</Text>
                </Link>
                <DeleteForm
                  action={deletePromotion}
                  id={p.id}
                  label={t("Delete programme")}
                  confirm={t("Delete {title}?", { title: p.title })}
                />
              </div>
            </li>
          ))}
        </ul>
        <nav className="pagination" aria-label={t("Programme pages")}>
          {page > 1 && (
            <Link href={href(page - 1)}>
              <Text>← Previous</Text>
            </Link>
          )}
          <span>
            <Text>Page</Text> {page} <Text>of</Text> {pages}
          </span>
          {page < pages && (
            <Link href={href(page + 1)}>
              <Text>Next →</Text>
            </Link>
          )}
        </nav>
      </section>
    </div>
  );
}
