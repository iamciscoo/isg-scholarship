import Link from "next/link";
import { Text } from "@/lib/i18n/workspace-text";
import { getWorkspaceText } from "@/lib/i18n/server";
export async function CatalogueTabs({ programmes = false }: { programmes?: boolean }) {
  const t = await getWorkspaceText();
  return (
    <nav className="catalogue-tabs" aria-label={t("Catalogue")}>
      <Link href="/admin/packages" aria-current={!programmes ? "page" : undefined}>
        <Text>Scholar packages</Text>
      </Link>
      <Link href="/admin/packages?tab=programmes" aria-current={programmes ? "page" : undefined}>
        <Text>Programmes</Text>
      </Link>
    </nav>
  );
}
