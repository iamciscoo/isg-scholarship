import { getWorkspaceText } from "@/lib/i18n/server";

import { Text } from "@/lib/i18n/workspace-text";
import Link from "next/link";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/session";
import { Workspace } from "@/components/layout/workspace";
import { DeleteForm } from "@/components/forms/delete-form";
import { deletePromotion } from "@/features/admin/opportunity-actions";
import { PromotionEditor, type Promotion } from "@/features/admin/opportunity-editor";
export default async function Promotions({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; edit?: string }>;
}) {
  const { db, user, role } = await requireStaff(true);
  const translate = await getWorkspaceText();
  const q = await searchParams;
  const page = Math.max(1, Math.min(100000, Number.parseInt(q.page || "1", 10) || 1));
  const list = await db
    .from("study_promotions")
    .select("*", { count: "exact" })
    .order("updated_at", { ascending: false })
    .order("id")
    .range((page - 1) * 20, page * 20 - 1);
  if (list.error) throw Error("Promotions unavailable");
  const edit =
    q.edit && z.uuid().safeParse(q.edit).success
      ? await db.from("study_promotions").select("*").eq("id", q.edit).maybeSingle()
      : null;
  if (edit?.error) throw Error("Promotion unavailable");
  return (
    <Workspace role={role} email={user.email || ""} active="promotions">
      <h1>
        <Text>{"Public study promotions."}</Text>
      </h1>
      <p>
        <Text>
          {
            "Show broad destinations, fields, study levels and funding types. The private opportunity catalogue is never used as a public listing."
          }
        </Text>
      </p>
      <div className="operation-grid">
        <section className="workspace-panel">
          <h2>{edit?.data ? translate("Edit promotion") : translate("Add promotion")}</h2>
          {edit?.data && (
            <Link href="/admin/promotions" className="text-link">
              <Text>{"Add another →"}</Text>
            </Link>
          )}
          <PromotionEditor value={edit?.data as Promotion | undefined} />
        </section>
        <section className="workspace-panel">
          <h2>
            <Text>{"Promotion history"}</Text>
          </h2>
          {!list.data?.length ? (
            <p>
              <Text>{"No promotions have been authored yet."}</Text>
            </p>
          ) : (
            <ul className="notification-history">
              {(list.data as Promotion[]).map((p) => (
                <li key={p.id}>
                  <strong>{p.title}</strong>
                  <p>
                    {p.published ? "Published" : "Private draft"} · {p.destination} · {p.study_level}
                  </p>
                  <div className="row-actions">
                    <Link className="text-link" href={`/admin/promotions?edit=${p.id}&page=${page}`}>
                      <Text>{"Edit promotion →"}</Text>
                    </Link>
                    <DeleteForm
                      action={deletePromotion}
                      id={p.id}
                      label="Delete promotion"
                      confirm={`Delete ${p.title}? This cannot be undone.`}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="pagination">
            {page > 1 && (
              <Link href={`/admin/promotions?page=${page - 1}`}>
                <Text>{"← Previous"}</Text>
              </Link>
            )}
            {page * 20 < (list.count || 0) && (
              <Link href={`/admin/promotions?page=${page + 1}`}>
                <Text>{"Next →"}</Text>
              </Link>
            )}
          </div>
        </section>
      </div>
    </Workspace>
  );
}
