import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth/session";
export default async function LegacyPromotions({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; edit?: string }>;
}) {
  await requireStaff(true);
  const query = await searchParams;
  const params = new URLSearchParams({ tab: "programmes" });
  if (query.page) params.set("page", query.page);
  if (query.edit) params.set("edit", query.edit);
  redirect(`/admin/packages?${params}`);
}
