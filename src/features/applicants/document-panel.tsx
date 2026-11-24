import { Text } from "@/lib/i18n/workspace-text";
import { FileLinks } from "@/features/consultations/file-links";
import { createClient } from "@/lib/supabase/server";
import { FileUpload } from "@/features/consultations/file-upload";
import { applicationDocumentCategories, applicationDocumentKeys } from "@/lib/validation/application-review";

export async function DocumentPanel({
  user,
  staff = false,
  editable = false,
  removable = false,
}: {
  user: string;
  staff?: boolean;
  editable?: boolean;
  removable?: boolean;
}) {
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
      <h2>
        <Text>{"Application documents"}</Text>
      </h2>
      {!staff && (
        <p>
          <Text>
            {
              "Upload clear copies now or add them later. Education, transcript and achievement categories can contain multiple files."
            }
          </Text>
        </p>
      )}
      <div className="operation-grid">
        {groups.map((request) => {
          const documents = files.data.filter((file) => file.category === request.category);
          const hasRequest = requests.data.some((item) => item.category === request.category);
          const multiple = !["passport", "photo"].includes(request.category);
          return (
            <article key={request.category} className="operation-card">
              <span className="status-pill">{<Text>{request.required ? "Required" : "Optional"}</Text>}</span>
              <h3>{<Text>{request.label}</Text>}</h3>
              {request.note && <p className="preserve-lines">{request.note}</p>}
              {(!staff || editable) && hasRequest && (
                <FileUpload
                  kind="document"
                  category={request.category}
                  applicant={staff ? user : undefined}
                  multiple={multiple}
                  label={`Choose ${request.label.toLowerCase()}`}
                />
              )}
              {documents.length ? (
                <ul className="case-file-list">
                  {documents.map((file, index) => (
                    <li key={file.id}>
                      <FileLinks
                        id={file.id}
                        removable={removable}
                        name={
                          file.original_name ||
                          `${file.mime === "application/pdf" ? "PDF" : "Image"} ${documents.length - index}`
                        }
                      />
                      {file.review_note && <p className="preserve-lines">{file.review_note}</p>}
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
