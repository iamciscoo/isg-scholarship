import { redirect } from "next/navigation";

export default async function LegacyOpportunities({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; edit?: string }>;
}) {
  const { page, edit } = await searchParams;
  const params = new URLSearchParams();
  if (typeof page === "string") params.set("page", page);
  if (typeof edit === "string") params.set("edit", edit);
  redirect(params.size ? `/admin/packages?${params}` : "/admin/packages");
}
