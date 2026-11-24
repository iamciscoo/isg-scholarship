import Link from "next/link";
import { Suspense } from "react";
import Form from "next/form";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Text } from "@/lib/i18n/workspace-text";
import { getWorkspaceText } from "@/lib/i18n/server";
import { ProgrammeEditor } from "./opportunity-editor";
import { DeleteForm } from "@/components/forms/delete-form";
import { deletePromotion } from "./opportunity-actions";
import { DestinationFlag } from "@/features/consultations/destination-select";
import type { Programme } from "@/lib/programmes";
import { CatalogueLayout } from "./catalogue-layout";
import { CatalogueLoading, CatalogueUnavailable } from "./catalogue-status";

const pageSize = 5;

export async function ProgrammeCatalogue({
  db,
  query,
}: {
  db: SupabaseClient;
  query: { page?: string; edit?: string; q?: string };
}) {
  const t = await getWorkspaceText();
  const requestedPage = Math.max(1, Math.min(100000, Number.parseInt(query.page || "1", 10) || 1));
  const search = (query.q || "")
    .slice(0, 100)
    .replace(/[%_\\*]/g, "")
    .trim();
  const filter = <T extends { ilike: (column: string, pattern: string) => T }>(request: T) =>
    search ? request.ilike("title", `%${search}%`) : request;
  const fetchPage = (page: number) =>
    filter(db.from("study_promotions").select("*", { count: "exact" }))
      .order("title")
      .order("id")
      .range((page - 1) * pageSize, page * pageSize - 1)
      .abortSignal(AbortSignal.timeout(8000));
  const editing = z.uuid().safeParse(query.edit).success;
  const [requested, edit] = await Promise.all([
    fetchPage(requestedPage),
    editing
      ? db
          .from("study_promotions")
          .select("*")
          .eq("id", query.edit)
          .abortSignal(AbortSignal.timeout(8000))
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  let list = requested;
  let page = requestedPage;
  if (page > 1 && (list.status === 416 || (!list.error && !list.data.length))) {
    const total = await filter(
      db.from("study_promotions").select("id", { count: "exact", head: true }),
    ).abortSignal(AbortSignal.timeout(8000));
    if (total.error) return <CatalogueUnavailable href="/admin/packages?tab=programmes" />;
    page = Math.max(1, Math.ceil((total.count || 0) / pageSize));
    list = await fetchPage(page);
  }
  if (list.error || edit.error || (editing && !edit.data))
    return <CatalogueUnavailable href="/admin/packages?tab=programmes" />;
  const pages = Math.max(1, Math.ceil((list.count || 0) / pageSize));
  const value = (edit.data as Programme | null) || undefined;
  const href = (next: number, id?: string) => {
    const params = new URLSearchParams({ tab: "programmes", page: String(next) });
    if (search) params.set("q", search);
    if (id) params.set("edit", id);
    return `/admin/packages?${params}`;
  };
  return (
    <CatalogueLayout
      key={value?.id || "new-programme"}
      label={value ? "Edit programme" : "Add programme"}
      editing={Boolean(value)}
      editor={
        <>
          <div className="panel-head">
            <h2>{t(value ? "Edit programme" : "Add programme")}</h2>
            {value && (
              <Link href={href(page)} className="text-link">
                <Text>New programme</Text> →
              </Link>
            )}
          </div>
          <Suspense fallback={<CatalogueLoading />}>
            <ProgrammeEditor value={value} />
          </Suspense>
        </>
      }
    >
      <section className="workspace-panel">
        <div className="panel-head">
          <h2>
            <Text>Programme options</Text>
          </h2>
          <span className="badge">{list.count || 0}</span>
        </div>
        <Form action="/admin/packages" className="programme-search">
          <input type="hidden" name="tab" value="programmes" />
          <label>
            <Text>Search programmes</Text>
            <input
              key={search}
              name="q"
              type="search"
              className="input"
              defaultValue={search}
              maxLength={100}
            />
          </label>
          <button className="button button-outline">
            <Text>Search</Text>
          </button>
        </Form>
        {!list.data?.length && (
          <p role="status">
            <Text>No programmes match these filters.</Text>
          </p>
        )}
        <ul className="programme-admin-list">
          {(list.data as Programme[]).map((p, index) => (
            <li key={p.id}>
              <div className="panel-head">
                <span className="programme-number">{(page - 1) * pageSize + index + 1}</span>
                <span className="badge">{t(p.published ? "Available" : "Unpublished")}</span>
              </div>
              <h3>
                <Link scroll={false} href={href(page, p.id)}>
                  {p.title}
                </Link>
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
                <Link className="button button-outline button-sm" scroll={false} href={href(page, p.id)}>
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
    </CatalogueLayout>
  );
}
