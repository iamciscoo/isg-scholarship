import Link from "next/link";
import Form from "next/form";
import { requireStaff } from "@/lib/auth/session";
import { UserDirectoryRows } from "@/features/admin/user-directory-rows";
import { Text } from "@/lib/i18n/workspace-text";
import { getLocale, getWorkspaceText } from "@/lib/i18n/server";
import { Button } from "@/components/ui/button";

type Directory = {
  accounts: number;
  staff: number;
  results: number;
  page: number;
  users: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    status: string | null;
    role: string;
    phone: string | null;
    nationality: string | null;
    residence: string | null;
    has_case: boolean;
    reference: string | null;
    applications: number;
    created_at: string;
    last_sign_in_at: string | null;
  }[];
};

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
  const [query, locale, t, { db }] = await Promise.all([
    searchParams, getLocale(), getWorkspaceText(), requireStaff(true),
  ]);
  const { data, error } = await db.rpc("admin_user_directory", {
    p_search: (query.q || "").trim(),
    p_role: query.role || "",
    p_page: Math.max(1, Math.min(2_147_483_647, Number.parseInt(query.page || "1", 10) || 1)),
  });
  if (error || !data) {
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

  const { accounts, staff, results, users, page } = data as unknown as Directory;
  const pages = Math.max(1, Math.ceil(results / 20));
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
            {accounts} <Text>accounts</Text>
          </h2>
          <p>
            {staff} <Text>staff</Text> · {accounts - staff} <Text>applicants</Text>
          </p>
        </div>
        <Form className="directory-search" action="/admin/users">
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
        </Form>
        {!users.length ? (
          <div className="empty-state">
            <p>
              <Text>No users match your search.</Text>
            </p>
          </div>
        ) : (
          <UserDirectoryRows
            users={users.map((user, index) => ({
              id: user.id,
              number: (page - 1) * 20 + index + 1,
              name: [user.first_name, user.last_name].filter(Boolean).join(" "),
              email: user.email || "",
              role: user.role,
              status: user.status || "—",
              phone: user.phone || "",
              location: [user.nationality, user.residence].filter(Boolean).join(" · "),
              caseHref: user.has_case ? `/admin/cases/${user.id}` : undefined,
              reference: user.reference || undefined,
              applications: user.applications,
              joined: date(user.created_at, locale),
              lastSignIn: date(user.last_sign_in_at, locale),
            }))}
          />
        )}
        <nav className="pagination" aria-label={t("User pages")}>
          <span>
            {results} <Text>results</Text> · <Text>Page</Text> {page} <Text>of</Text> {pages}
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
