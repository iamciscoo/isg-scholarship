import { requireStaff } from "@/lib/auth/session";
import { Workspace } from "@/components/layout/workspace";
import { stageLabel } from "@/lib/validation/leads";
export default async function Audit() {
  const { db, user, role } = await requireStaff(true);
  const [audit, summary] = await Promise.all([
    db
      .from("audit_logs")
      .select("id,action,entity_id,actor_id,created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    db.rpc("notification_summary"),
  ]);
  return (
    <Workspace role={role} email={user.email || ""} active="audit">
      <h1>Activity you can account for.</h1>
      <p>Recent security and review activity, alongside the email delivery queue.</p>
      <section className="workspace-panel">
        <h2>Email delivery</h2>
        {summary.error ? (
          <p className="notice notice-error">Delivery status is unavailable.</p>
        ) : (
          <div className="stat-grid">
            {["pending", "processing", "sent", "failed"].map((state) => (
              <div className="stat-box" key={state}>
                <span>{stageLabel(state)}</span>
                <strong>
                  {(summary.data as { state: string; total: number }[] | null)?.find(
                    (row) => row.state === state,
                  )?.total || 0}
                </strong>
              </div>
            ))}
          </div>
        )}
        <p className="field-help">
          A queued email is not a delivered email. Failed messages require review. Provider availability does
          not affect saved assessments.
        </p>
      </section>
      <section className="workspace-panel">
        <h2>Most recent 100 audit events</h2>
        {audit.error ? (
          <p className="notice notice-error">Audit events could not be loaded.</p>
        ) : !audit.data?.length ? (
          <p>No activity has been recorded.</p>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Record</th>
                  <th>Actor</th>
                  <th>Time (UTC)</th>
                </tr>
              </thead>
              <tbody>
                {audit.data.map((row) => (
                  <tr key={row.id}>
                    <td>{row.action}</td>
                    <td>{row.entity_id || "System"}</td>
                    <td>{row.actor_id || "Guest / system"}</td>
                    <td>{new Date(row.created_at).toISOString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </Workspace>
  );
}
