import Link from "next/link";
export function FileLinks({ id, name }: { id: string; name: string }) {
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
        View
      </Link>
    </div>
  );
}
