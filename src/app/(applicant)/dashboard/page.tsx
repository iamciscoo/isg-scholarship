import Link from "next/link";
import { redirect } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { Workspace } from "@/components/layout/workspace";
import { Button } from "@/components/ui/button";
export default async function Dashboard() {
  const { db, user, profile, role } = await requireUser();
  if (role !== "applicant") redirect(role === "admin" ? "/admin" : "/advisor");
  const linked = await db.rpc("link_my_assessments");
  const { data: assessments, error } = await db
    .from("eligibility_assessments")
    .select("id,reference,study_level,preferred_fields,created_at")
    .eq("applicant_id", user.id)
    .order("created_at", { ascending: false });
  const complete = [
    profile.first_name,
    profile.last_name,
    profile.phone,
    profile.nationality,
    profile.residence,
  ].filter(Boolean).length;
  return (
    <Workspace role={role} email={user.email || ""}>
      <h1>Welcome{profile.first_name ? `, ${profile.first_name}` : " to ISG"}.</h1>
      <p>Your starting point for a more informed education journey.</p>
      <div className="stat-grid">
        <div className="stat-box">
          <span>Contact profile</span>
          <strong>{complete}/5</strong>
          <Link href="/dashboard/profile" className="text-link">
            Update my profile
          </Link>
        </div>
        <div className="stat-box">
          <span>Assessments received</span>
          <strong>{error ? "Unavailable" : assessments?.length || 0}</strong>
        </div>
      </div>
      {(error || linked.error) && (
        <p role="alert" className="notice notice-error">
          We couldn’t load your assessment information. Please refresh or contact ISG.
        </p>
      )}
      <section className="workspace-panel">
        <h2>Your initial assessments</h2>
        {!assessments?.length ? (
          <div className="empty-state">
            <ClipboardList size={32} />
            <h3>Tell us where you want to go.</h3>
            <p>
              Submit an initial assessment using your verified account email. Your assessment will appear here
              after it is linked securely.
            </p>
            <Button asChild>
              <Link href="/eligibility">Check my eligibility</Link>
            </Button>
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Study goal</th>
                  <th>Field</th>
                  <th>Received</th>
                </tr>
              </thead>
              <tbody>
                {assessments.map((row) => (
                  <tr key={row.id}>
                    <td>{row.reference}</td>
                    <td>{row.study_level}</td>
                    <td>{row.preferred_fields}</td>
                    <td>
                      {new Date(row.created_at).toLocaleDateString("en-GB", {
                        timeZone: "Africa/Dar_es_Salaam",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section className="workspace-panel">
        <h2>What happens next?</h2>
        <p>
          An advisor reviews your assessment and contacts you about next steps. Your account currently
          supports your contact profile and assessment history. Document requests and application tracking
          will be introduced in the next platform phase.
        </p>
        <Link className="text-link mt-5" href="/contact">
          Contact ISG
        </Link>
      </section>
    </Workspace>
  );
}
