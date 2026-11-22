import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { Workspace } from "@/components/layout/workspace";
import { Button } from "@/components/ui/button";
import { consultationProgress } from "@/features/consultations/progress";
import type { Inbox } from "@/features/notifications/types";

export default async function Dashboard() {
  const { db, user, profile, role } = await requireUser();
  if (role !== "applicant") redirect(role === "admin" ? "/admin" : "/advisor");
  const [consultation, draft, assigned, updates] = await Promise.all([
    db
      .from("consultation_cases")
      .select("payment_status,completed_at,current_declaration_id,application_status")
      .eq("user_id", user.id)
      .maybeSingle(),
    db.from("consultation_drafts").select("step").eq("user_id", user.id).maybeSingle(),
    db
      .from("study_applications")
      .select("id,package_state")
      .eq("user_id", user.id)
      .neq("status", "Cancelled")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    db.rpc("account_notification_inbox"),
  ]);
  const unavailable = consultation.error || draft.error || assigned.error;
  const progress = consultationProgress(consultation.data, {
    hasDraft: !!draft.data,
    assignedPackage: assigned.data,
  });
  const latest = (updates.data as Inbox | null)?.items?.slice(0, 5) || [];
  return (
    <Workspace role={role} email={user.email || ""}>
      <h1>{profile.first_name ? `Welcome, ${profile.first_name}` : "Your ISG dashboard"}</h1>
      {unavailable ? (
        <p role="alert" className="notice notice-error">
          Your progress could not be loaded. Please refresh.
        </p>
      ) : (
        <>
          <section className="workspace-panel">
            <span className="status-pill">Current stage</span>
            <h2>{progress.stage}</h2>
            <p>{progress.action}</p>
            <Button asChild>
              <Link href={progress.href}>{progress.label}</Link>
            </Button>
          </section>
          <dl className="stat-grid">
            <div className="stat-box">
              <dt>Consultation</dt>
              <dd>{progress.consultation}</dd>
            </div>
            <div className="stat-box">
              <dt>Receipt</dt>
              <dd>{progress.receipt}</dd>
            </div>
            <div className="stat-box">
              <dt>Scholarship application</dt>
              <dd>{progress.application}</dd>
            </div>
          </dl>
        </>
      )}
      <section className="workspace-panel">
        <h2>Latest updates</h2>
        {updates.error ? (
          <p role="alert">Updates could not be loaded.</p>
        ) : latest.length ? (
          <ol className="notification-history">
            {latest.map((item) => (
              <li key={item.id}>
                {item.link ? (
                  <Link className="text-link" href={item.link}>
                    {item.title}
                  </Link>
                ) : (
                  <strong>{item.title}</strong>
                )}
                <p className="preserve-lines">{item.body}</p>
                <time dateTime={item.created_at}>
                  {new Date(item.created_at).toLocaleDateString("en-GB", {
                    timeZone: "Africa/Dar_es_Salaam",
                  })}
                </time>
              </li>
            ))}
          </ol>
        ) : (
          <p>No updates yet.</p>
        )}
      </section>
    </Workspace>
  );
}
