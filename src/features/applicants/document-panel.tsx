import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { FileUpload } from "@/features/consultations/file-upload";
import { ActionForm } from "@/components/forms/action-form";
import { applicationDocumentCategories, applicationDocumentKeys } from "@/lib/validation/application-review";
import { requestDocument, reviewDocument } from "./application-actions";

const fileStatuses: Record<string, string> = {
  approved: "Approved",
  pending: "Awaiting review",
  rejected: "Correction requested",
};

export async function DocumentPanel({ user, staff = false }: { user: string; staff?: boolean }) {
  const db = await createClient();
  const [requests, files] = await Promise.all([
    db.from("document_requests").select("category,label,required,note").eq("user_id", user),
    db
      .from("case_files")
      .select("id,category,mime,original_name,review_status,review_note,created_at")
      .eq("user_id", user)
      .eq("kind", "document")
      .order("created_at", { ascending: false })
      .order("id"),
  ]);
  if (requests.error || files.error) throw Error("Documents unavailable");
  const groups = [
    ...applicationDocumentKeys.flatMap((key) => requests.data.filter((request) => request.category === key)),
    ...Array.from(new Set(files.data.map((file) => file.category)))
      .filter((category) => !requests.data.some((request) => request.category === category))
      .map((category) => ({
        category,
        label:
          applicationDocumentCategories[category as keyof typeof applicationDocumentCategories] ||
          "Additional document",
        required: false,
        note: "",
      })),
  ];

  return (
    <section className="workspace-panel" id="application-documents">
      <h2>Application documents</h2>
      {!staff && (
        <p>
          Upload clear copies now or add them later. Education, transcript and achievement categories can
          contain multiple files.
        </p>
      )}
      {staff && (
        <details className="package-gallery my-4">
          <summary>Request a document</summary>
          <ActionForm action={requestDocument} label="Send request">
            <input type="hidden" name="user" value={user} />
            <div className="form-grid">
              <label>
                Category
                <select name="category">
                  {applicationDocumentKeys.map((category) => (
                    <option key={category} value={category}>
                      {applicationDocumentCategories[category]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Document title
                <input name="label" maxLength={160} required />
              </label>
            </div>
            <label>
              Instructions for the applicant
              <textarea name="note" maxLength={1000} />
            </label>
            <label className="checkbox-field">
              <input name="required" type="checkbox" defaultChecked />
              Required for ISG review
            </label>
          </ActionForm>
        </details>
      )}
      <div className="operation-grid">
        {groups.map((request) => {
          const documents = files.data.filter((file) => file.category === request.category);
          const hasRequest = requests.data.some((item) => item.category === request.category);
          const multiple = !["passport", "photo"].includes(request.category);
          return (
            <article key={request.category} className="operation-card">
              <span className="status-pill">{request.required ? "Required" : "Optional"}</span>
              <h3>{request.label}</h3>
              {request.note && <p className="preserve-lines">{request.note}</p>}
              {!staff && hasRequest && (
                <FileUpload
                  kind="document"
                  category={request.category}
                  multiple={multiple}
                  label={`Choose ${request.label.toLowerCase()}`}
                />
              )}
              {documents.length ? (
                <ul className="case-file-list">
                  {documents.map((file, index) => (
                    <li key={file.id}>
                      <Link className="break-all" href={`/api/case-files/${file.id}`}>
                        {file.original_name ||
                          `${file.mime === "application/pdf" ? "PDF" : "Image"} ${documents.length - index}`}
                      </Link>
                      <span>{fileStatuses[file.review_status]}</span>
                      {file.review_note && <p className="preserve-lines">{file.review_note}</p>}
                      {staff && (
                        <details className="package-gallery w-full">
                          <summary>
                            {file.review_status === "pending" ? "Review file" : "Edit review"}
                          </summary>
                          <ActionForm action={reviewDocument} label="Save review">
                            <input name="id" type="hidden" value={file.id} />
                            <input name="user" type="hidden" value={user} />
                            <label>
                              Decision
                              <select
                                name="approve"
                                defaultValue={file.review_status === "rejected" ? "false" : "true"}
                              >
                                <option value="true">Approve</option>
                                <option value="false">Request correction</option>
                              </select>
                            </label>
                            <label>
                              Note to applicant (required for corrections)
                              <textarea name="note" maxLength={1000} defaultValue={file.review_note} />
                            </label>
                          </ActionForm>
                        </details>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="field-help">No files uploaded.</p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
