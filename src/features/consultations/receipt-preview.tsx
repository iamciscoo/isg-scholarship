import { Text } from "@/lib/i18n/workspace-text";
import Link from "next/link";
import Image from "next/image";

export function ReceiptPreview({ id, mime }: { id: string; mime: string }) {
  const download = `/api/case-files/${id}`;
  if (mime !== "image/webp") {
    return (
      <div className="receipt-links">
        <Link href={`${download}?preview=1`} target="_blank" rel="noopener noreferrer" className="text-link">
          <Text>{"View receipt PDF"}</Text>
        </Link>
        <Link href={download} className="text-link">
          <Text>{"Download receipt PDF"}</Text>
        </Link>
      </div>
    );
  }
  const preview = `${download}?preview=1`;
  return (
    <div className="receipt-preview">
      <Image src={preview} alt="Uploaded payment receipt" width={720} height={780} unoptimized />
      <div className="receipt-links">
        <Link href={preview} target="_blank" rel="noopener" className="text-link">
          <Text>{"Open receipt in a new tab"}</Text>
        </Link>
        <Link href={download} className="text-link">
          <Text>{"Download receipt"}</Text>
        </Link>
      </div>
    </div>
  );
}
