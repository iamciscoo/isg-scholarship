import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
export default async function LegacyMfa() {
  const { role } = await requireUser();
  redirect(role === "admin" ? "/admin" : role === "advisor" ? "/advisor" : "/dashboard");
}
