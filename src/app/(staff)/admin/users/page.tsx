import Link from "next/link";
import { requireStaff } from "@/lib/auth/session";
import { adminClient } from "@/lib/supabase/admin";
import { UserRoleMenu } from "@/features/admin/user-role-menu";

const date = (value: string | null | undefined) =>
  value
    ? new Date(value).toLocaleDateString("en-GB", {
        timeZone: "Africa/Dar_es_Salaam",
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

export default async function AdminUsers() {
  await requireStaff(true);
  const admin = adminClient();
  const [accounts, profiles, roles, assessments, applications, cases] = await Promise.all([
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    admin
      .from("profiles")
      .select("id,first_name,last_name,phone,nationality,residence,status,created_at"),
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
        <h1>Users.</h1>
        <p>Every account on the platform, with the activity attached to it.</p>
        <p className="notice notice-error" role="alert">
          The user directory could not be loaded. Refresh the page and try again.
        </p>
      </>
    );
  }

  const profileById = new Map((profiles.data || []).map((row) => [row.id, row]));
  const roleById = new Map((roles.data || []).map((row) => [row.user_id, row.role]));
  const assessmentById = new Map(
    (assessments.data || []).map((row) => [row.applicant_id as string, row]),
  );
  const caseIds = new Set((cases.data || []).map((row) => row.user_id as string));
  const applicationCount = new Map<string, number>();
  for (const row of applications.data || [])
    applicationCount.set(row.user_id, (applicationCount.get(row.user_id) || 0) + 1);

  const users = [...(accounts.data?.users ?? [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  const staff = users.filter((user) => (roleById.get(user.id) || "applicant") !== "applicant").length;

  return (
    <>
      <h1>Users.</h1>
      <p>Every account on the platform, with the activity attached to it.</p>
      <section className="workspace-panel">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2>{users.length} accounts</h2>
          <p>
            {staff} staff · {users.length - staff} applicants
          </p>
        </div>
        {!users.length ? (
          <div className="empty-state">
            <h3>No accounts yet.</h3>
            <p>New applicants and team members will appear here.</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Contact</th>
                  <th>Consultation</th>
                  <th>Applications</th>
                  <th>Joined</th>
                  <th>Last sign-in</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const profile = profileById.get(user.id);
                  const role = roleById.get(user.id) || "applicant";
                  const assessment = assessmentById.get(user.id);
                  const name = `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim();
                  return (
                    <tr key={user.id}>
                      <td>
                        {name || "Unnamed account"}
                        <small>{user.email}</small>
                      </td>
                      <td className="capitalize">{role}</td>
                      <td className="capitalize">{profile?.status || "—"}</td>
                      <td>
                        {profile?.phone || "No phone"}
                        <small>{[profile?.nationality, profile?.residence].filter(Boolean).join(" · ") || "—"}</small>
                      </td>
                      <td>
                        {assessment ? (
                          <Link className="text-link" href={`/admin/cases/${user.id}`}>
                            {assessment.reference}
                          </Link>
                        ) : caseIds.has(user.id) ? (
                          <Link className="text-link" href={`/admin/cases/${user.id}`}>
                            Open case
                          </Link>
                        ) : (
                          "None"
                        )}
                      </td>
                      <td>{applicationCount.get(user.id) || 0}</td>
                      <td>{date(profile?.created_at || user.created_at)}</td>
                      <td>{date(user.last_sign_in_at)}</td>
                      <td>
                        <UserRoleMenu id={user.id} role={role} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
