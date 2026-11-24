import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { UserRoleMenu } from "@/features/admin/user-role-menu";
import { requireStaff } from "@/lib/auth/session";
import { getWorkspaceText } from "@/lib/i18n/server";
import { adminClient } from "@/lib/supabase/admin";

export default async function UserRecord({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, { db }, t] = await Promise.all([params, requireStaff(true), getWorkspaceText()]);
  if (!z.uuid().safeParse(id).success) notFound();
  const [account, profile, role, consultation] = await Promise.all([
    adminClient().auth.admin.getUserById(id),
    db
      .from("profiles")
      .select("first_name,last_name,phone,nationality,residence,status")
      .eq("id", id)
      .maybeSingle(),
    db.from("user_roles").select("role").eq("user_id", id).maybeSingle(),
    db.from("consultation_cases").select("user_id").eq("user_id", id).maybeSingle(),
  ]);
  if (account.error?.status === 404 || (!account.error && !account.data.user)) notFound();
  if (account.error || profile.error || role.error || consultation.error)
    throw Error("User record unavailable");
  const user = account.data.user;
  const details = profile.data;
  const name = [details?.first_name, details?.last_name].filter(Boolean).join(" ");
  const userRole = role.data?.role || "applicant";
  const facts: [string, string | undefined][] = [
    ["Email address", user.email],
    ["Role", t(userRole)],
    ["Status", details?.status && t(details.status)],
    ["Registration status", t(user.email_confirmed_at ? "Email confirmed" : "Awaiting email confirmation")],
    ["Phone number", details?.phone],
    ["Nationality", details?.nationality],
    ["Country of residence", details?.residence],
  ];
  return (
    <>
      <Link href="/admin/users" className="text-link">
        {t("Users")}
      </Link>
      <h1>{name || user.email || t("Unnamed account")}</h1>
      <section className="workspace-panel">
        <div className="panel-head">
          <h2>{t("Account details")}</h2>
          <UserRoleMenu id={id} role={userRole} />
        </div>
        <dl className="case-card-progress">
          {facts.map(([label, value]) => (
            <div key={label}>
              <dt>{t(label)}</dt>
              <dd>{value || t("Not provided")}</dd>
            </div>
          ))}
        </dl>
        {consultation.data && (
          <Link href={`/admin/cases/${id}`} className="text-link">
            {t("Open case")}
          </Link>
        )}
      </section>
    </>
  );
}
