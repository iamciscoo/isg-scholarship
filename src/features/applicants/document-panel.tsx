import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { FileUpload } from "@/features/consultations/file-upload";
import { ActionForm } from "@/components/forms/action-form";
import { requestDocument, reviewDocument } from "./application-actions";
export async function DocumentPanel({ user, staff = false }: { user: string; staff?: boolean }) {
  const db = await createClient();
  const [requests, files] = await Promise.all([
    db.from("document_requests").select("id,category,label,required,note").eq("user_id", user),
    db
      .from("case_files")
      .select("id,category,review_status,review_note,created_at")
      .eq("user_id", user)
      .eq("kind", "document")
      .order("created_at", { ascending: false }),
  ]);
  if (requests.error || files.error) throw Error("Documents unavailable");
  return (
    <section className="workspace-panel">
      <h2>Required documents</h2>
      <p>
        Upload clear copies only after your advisor requests them. Documents are private to you and the
        authorized ISG team. An uploaded file is not automatically approved.
      </p>
      {staff && (
        <ActionForm action={requestDocument} label="Save document request">
          <input type="hidden" name="user" value={user} />
          <label>
            Category
            <select name="category">
              {["passport", "certificates", "transcripts", "photo", "other"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Document title
            <input name="label" maxLength={160} required />
          </label>
          <label>
            Instructions
            <textarea name="note" maxLength={1000} />
          </label>
          <label className="checkbox-field">
            <input name="required" type="checkbox" defaultChecked />
            Required for application preparation
          </label>
        </ActionForm>
      )}
      <div className="operation-grid">
        {requests.data?.map((r) => (
          <article key={r.id} className="operation-card">
            <span className="status-pill">{r.required ? "Required" : "Optional"}</span>
            <h3>{r.label}</h3>
            {r.note && <p>{r.note}</p>}
            {!staff && <FileUpload kind="document" category={r.category} />}
            <ul className="case-file-list">
              {files.data
                ?.filter((f) => f.category === r.category)
                .map((f) => (
                  <li key={f.id}>
                    <Link href={`/api/case-files/${f.id}`}>Download private file</Link>
                    <span>{f.review_status}</span>
                    {f.review_note && <p>{f.review_note}</p>}
                    {staff && (
                      <ActionForm action={reviewDocument} label="Save review">
                        <input name="id" type="hidden" value={f.id} />
                        <input name="user" type="hidden" value={user} />
                        <label>
                          Decision
                          <select name="approve">
                            <option value="true">Approve document</option>
                            <option value="false">Request correction</option>
                          </select>
                        </label>
                        <label>
                          Note to applicant
                          <textarea name="note" minLength={3} maxLength={1000} required />
                        </label>
                      </ActionForm>
                    )}
                  </li>
                ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
