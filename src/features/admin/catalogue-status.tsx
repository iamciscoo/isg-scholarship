import Link from "next/link";
import { Text } from "@/lib/i18n/workspace-text";

export function CatalogueLoading() {
  return (
    <p className="workspace-panel" role="status">
      <Text>Loading catalogue…</Text>
    </p>
  );
}

export function CatalogueUnavailable({ href }: { href: string }) {
  return (
    <div className="workspace-panel" role="alert">
      <p>
        <Text>The catalogue could not be loaded. Please try again.</Text>
      </p>
      <Link href={href} className="text-link" prefetch={false}>
        <Text>Back to the catalogue</Text>
      </Link>
    </div>
  );
}
