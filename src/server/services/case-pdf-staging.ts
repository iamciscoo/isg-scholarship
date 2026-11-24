import "server-only";
import { adminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof adminClient>;
const bucket = "case-pdf-staging";

export const stagedPdfPath = (uploader: string, id: string) => `${uploader}/${id}.pdf`;

export function stagedPdfStorage(db: Admin) {
  return db.storage.from(bucket);
}

export async function removeExpiredPdfUploads() {
  const db = adminClient();
  const { data: paths, error } = await db.rpc("expired_case_pdf_uploads");
  if (error) throw Error("expired_case_pdf_lookup_failed");
  if (!paths?.length) return;
  const removed = await stagedPdfStorage(db).remove(paths);
  if (removed.error) throw Error("expired_case_pdf_cleanup_failed");
}
