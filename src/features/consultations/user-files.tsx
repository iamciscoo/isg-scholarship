import { createClient } from "@/lib/supabase/server";
import { applicationDocumentCategories } from "@/lib/validation/application-review";
import { FileLinks } from "./file-links";

export async function UserFiles({ user }: { user: string }) {
  const db = await createClient();
  const { data: files, error } = await db
    .from("case_files")
    .select("id,kind,category,original_name,mime,application_id,created_at")
    .eq("user_id", user)
    .order("created_at", { ascending: false })
    .order("id");
  if (error) throw Error("Applicant files unavailable");
  if (!files?.length) return null;
  return (
    <section className="workspace-panel">
      <h2>Applicant files</h2>
      <ul className="case-file-list">
        {files.map((file) => (
          <li key={file.id}>
            <span className="status-pill">
              {file.kind === "receipt"
                ? file.application_id
                  ? "Package receipt"
                  : "Consultation receipt"
                : applicationDocumentCategories[
                    file.category as keyof typeof applicationDocumentCategories
                  ] || "Document"}
            </span>
            <FileLinks
              id={file.id}
              name={
                file.original_name ||
                `${file.mime === "application/pdf" ? "PDF" : "Image"} ${file.id.slice(0, 8)}`
              }
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
