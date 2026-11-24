import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { UserRoleMenu } from "@/features/admin/user-role-menu";
import { UserFiles } from "@/features/consultations/user-files";
import { requireStaff } from "@/lib/auth/session";
import { getLocale, getWorkspaceText } from "@/lib/i18n/server";
import { adminClient } from "@/lib/supabase/admin";

export default async function UserRecord({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, { db }, t, locale] = await Promise.all([params, requireStaff(true), getWorkspaceText(), getLocale()]);
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
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "Africa/Dar_es_Salaam" });
  const groups: { title: string; facts: [string, string | undefined][] }[] = [
    {
      title: "Contact details",
      facts: [
        ["Email address", user.email],
        ["Phone number", details?.phone],
        ["Nationality", details?.nationality],
        ["Country of residence", details?.residence],
      ],
    },
    {
      title: "Account details",
      facts: [
        ["Role", t(userRole)],
        ["Status", details?.status && t(details.status)],
        ["Registration status", t(user.email_confirmed_at ? "Email confirmed" : "Awaiting email confirmation")],
        ["Joined", date.format(new Date(user.created_at))],
        ["Last sign-in", user.last_sign_in_at && date.format(new Date(user.last_sign_in_at))],
      ],
    },
  ];
  return (
    <>
      <Link href="/admin/users" className="text-link">
        {t("Users")}
      </Link>
      <header className="user-record-header">
        <h1>{name || user.email || t("Unnamed account")}</h1>
        <div className="workspace-action-row">
          {consultation.data && (
            <Link href={`/admin/cases/${id}`} className="button button-outline button-sm">
              {t("Open case")}
            </Link>
          )}
          <UserRoleMenu id={id} role={userRole} />
        </div>
      </header>
      <div className="user-record-grid">
        {groups.map(({ title, facts }) => (
          <section className="workspace-panel" key={title}>
            <h2>{t(title)}</h2>
            <dl className="user-record-facts">
              {facts.map(([label, value]) => (
                <div key={label}>
                  <dt>{t(label)}</dt>
                  <dd>{value || t("Not provided")}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
      {consultation.data && <UserFiles user={id} />}
    </>
  );
}
