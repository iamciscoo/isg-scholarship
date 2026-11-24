import { Text } from "@/lib/i18n/workspace-text";
import Link from "next/link";
import { RemoveFile } from "./remove-file";
export function FileLinks({ id, name, removable = false }: { id: string; name: string; removable?: boolean }) {
  return (
    <div className="private-file-links">
      <Link className="break-all" href={`/api/case-files/${id}`} title="Download file">
        {name}
      </Link>
      <Link
        className="text-link"
        href={`/api/case-files/${id}?preview=1`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`View ${name}`}
      >
        <Text>{"View"}</Text>
      </Link>
      {removable && <RemoveFile id={id} />}
    </div>
  );
}
