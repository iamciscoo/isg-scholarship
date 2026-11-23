import Link from "next/link";
import { requireStaff } from "@/lib/auth/session";
import { adminClient } from "@/lib/supabase/admin";
import { UserDirectoryRows } from "@/features/admin/user-directory-rows";
import { Text } from "@/lib/i18n/workspace-text";
import { getLocale, getWorkspaceText } from "@/lib/i18n/server";
import { Button } from "@/components/ui/button";

const date = (value: string | null | undefined, locale: string) =>
  value
    ? new Date(value).toLocaleDateString(locale, {
        timeZone: "Africa/Dar_es_Salaam",
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

export default async function AdminUsers({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; page?: string }>;
}) {
  const [query, locale, t] = await Promise.all([searchParams, getLocale(), getWorkspaceText()]);
  await requireStaff(true);
  const admin = adminClient();
  const [accounts, profiles, roles, assessments, applications, cases] = await Promise.all([
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    admin.from("profiles").select("id,first_name,last_name,phone,nationality,residence,status,created_at"),
    admin.from("user_roles").select("user_id,role"),
    admin
      .from("eligibility_assessments")
      .select("applicant_id,reference,created_at")
      .not("applicant_id", "is", null),
    admin.from("study_applications").select("user_id"),
    admin.from("consultation_cases").select("user_id"),
  ]);

  const failed = [profiles, roles, assessments, applications, cases].find((result) => result.error);
  if (accounts.error || failed) {
    return (
      <>
        <h1>
          <Text>Users</Text>
        </h1>

        <p className="notice notice-error" role="alert">
          <Text>The user directory could not be loaded. Refresh the page and try again.</Text>
        </p>
      </>
    );
  }

  const profileById = new Map((profiles.data || []).map((row) => [row.id, row]));
  const roleById = new Map((roles.data || []).map((row) => [row.user_id, row.role]));
  const assessmentById = new Map((assessments.data || []).map((row) => [row.applicant_id as string, row]));
  const caseIds = new Set((cases.data || []).map((row) => row.user_id as string));
  const applicationCount = new Map<string, number>();
  for (const row of applications.data || [])
    applicationCount.set(row.user_id, (applicationCount.get(row.user_id) || 0) + 1);

  const users = [...(accounts.data?.users ?? [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  const staff = users.filter((user) => (roleById.get(user.id) || "applicant") !== "applicant").length;

  const term = (query.q || "").trim().toLocaleLowerCase(locale);
  const filtered = users.filter((user) => {
    const profile = profileById.get(user.id);
    const role = roleById.get(user.id) || "applicant";
    return (
      (!query.role || query.role === role) &&
      (!term ||
        [
          user.email,
          profile?.first_name,
          profile?.last_name,
          profile?.phone,
          assessmentById.get(user.id)?.reference,
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase(locale)
          .includes(term))
    );
  });
  const pages = Math.max(1, Math.ceil(filtered.length / 20));
  const page = Math.min(pages, Math.max(1, Number.parseInt(query.page || "1", 10) || 1));
  const pageHref = (n: number) =>
    `/admin/users?${new URLSearchParams({ q: query.q || "", role: query.role || "", page: String(n) })}`;

  return (
    <>
      <h1>
        <Text>Users</Text>
      </h1>

      <section className="workspace-panel">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2>
            {users.length} <Text>accounts</Text>
          </h2>
          <p>
            {staff} <Text>staff</Text> · {users.length - staff} <Text>applicants</Text>
          </p>
        </div>
        <form className="directory-search" action="/admin/users">
          <div className="field">
            <label htmlFor="user-query">
              <Text>Search users</Text>
            </label>
            <input
              id="user-query"
              name="q"
              type="search"
              defaultValue={query.q}
              placeholder={t("Name, email or reference")}
            />
          </div>
          <div className="field">
            <label htmlFor="user-role">
              <Text>Role</Text>
            </label>
            <select id="user-role" name="role" defaultValue={query.role || ""}>
              <option value="">{t("All roles")}</option>
              {["admin", "advisor", "applicant"].map((role) => (
                <option value={role} key={role}>
                  {t(role)}
                </option>
              ))}
            </select>
          </div>
          <Button size="sm">
            <Text>Apply filters</Text>
          </Button>
          {(query.q || query.role) && (
            <Link href="/admin/users" className="text-link">
              <Text>Reset</Text>
            </Link>
          )}
        </form>
        {!filtered.length ? (
          <div className="empty-state">
            <p>
              <Text>No users match your search.</Text>
            </p>
          </div>
        ) : (
          <UserDirectoryRows
            users={filtered.slice((page - 1) * 20, page * 20).map((user, index) => {
              const profile = profileById.get(user.id);
              return {
                id: user.id,
                number: (page - 1) * 20 + index + 1,
                name: `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim(),
                email: user.email || "",
                role: roleById.get(user.id) || "applicant",
                status: profile?.status || "—",
                phone: profile?.phone || "",
                location: [profile?.nationality, profile?.residence].filter(Boolean).join(" · "),
                href: caseIds.has(user.id) ? `/admin/cases/${user.id}` : undefined,
                reference: assessmentById.get(user.id)?.reference,
                applications: applicationCount.get(user.id) || 0,
                joined: date(profile?.created_at || user.created_at, locale),
                lastSignIn: date(user.last_sign_in_at, locale),
              };
            })}
          />
        )}
        <nav className="pagination" aria-label={t("User pages")}>
          <span>
            {filtered.length} <Text>results</Text> · <Text>Page</Text> {page} <Text>of</Text> {pages}
          </span>
          <div>
            {page > 1 && (
              <Link href={pageHref(page - 1)}>
                <Text>Previous</Text>
              </Link>
            )}
            {page < pages && (
              <Link href={pageHref(page + 1)}>
                <Text>Next</Text>
              </Link>
            )}
          </div>
        </nav>
      </section>
    </>
  );
}
