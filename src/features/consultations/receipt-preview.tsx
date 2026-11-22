import Link from "next/link";
import Image from "next/image";

export function ReceiptPreview({ id, mime }: { id: string; mime: string }) {
  const download = `/api/case-files/${id}`;
  if (mime !== "image/webp") {
    return (
      <div className="receipt-links">
        <Link href={download} className="text-link">
          Download receipt PDF
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
          Open receipt in a new tab
        </Link>
        <Link href={download} className="text-link">
          Download receipt
        </Link>
      </div>
    </div>
  );
}
