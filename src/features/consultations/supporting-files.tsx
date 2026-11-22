import Link from "next/link";
import { FileUpload } from "./file-upload";

export function SupportingFiles({
  files,
  staff = false,
}: {
  files: { id: string; original_name?: string }[];
  staff?: boolean;
}) {
  if (staff && !files.length) return null;
  return (
    <section className="workspace-panel">
      <h2>Consultation supporting files</h2>
      {!staff && <FileUpload kind="support" multiple label="Supporting files (optional)" />}
      {!!files.length && (
        <ul className="case-file-list">
          {files.map((file, index) => (
            <li key={file.id}>
              <Link className="break-all" href={`/api/case-files/${file.id}`}>
                {file.original_name || `Download supporting file ${files.length - index}`}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
