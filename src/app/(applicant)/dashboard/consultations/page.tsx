import Link from "next/link";
import { ClipboardList, ArrowUpRight } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { Workspace } from "@/components/layout/workspace";
import { Button } from "@/components/ui/button";
import { stageLabel } from "@/lib/validation/leads";
import { PaymentPanel } from "@/features/consultations/payment-panel";
import { CaseSupport } from "@/features/consultations/case-support";
type Consultation = {
  id: string;
  reference: string;
  study_level: string;
  preferred_fields: string;
  created_at: string;
  stage: Parameters<typeof stageLabel>[0];
};
export default async function Consultations() {
  const { db, user, role } = await requireUser();
  const [requests, draft] = await Promise.all([
    db.rpc("my_consultations"),
    db.from("consultation_drafts").select("step,updated_at").eq("user_id", user.id).maybeSingle(),
  ]);
  if (requests.error || draft.error) throw new Error("Consultations unavailable");
  const [payment, files, instructions] = await Promise.all([
    db.from("consultation_cases").select("*").eq("user_id", user.id).maybeSingle(),
    db
      .from("case_files")
      .select("id,user_id,kind,category,review_status,review_note,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    db.rpc("consultation_payment_instructions"),
  ]);
  if (payment.error || files.error || instructions.error) throw Error("Consultation payment unavailable");
  return (
    <Workspace role={role} email={user.email || ""} active="consultations">
      <div className="workspace-page-heading">
        <div>
          <h1>Your consultations.</h1>
          <p>Follow your requests and continue preparing with ISG.</p>
        </div>
        <Button asChild>
          <Link href="/consultation">
            {draft.data ? "Continue consultation" : "Start consultation"}
            <ArrowUpRight size={17} />
          </Link>
        </Button>
      </div>
      {payment.data && (
        <PaymentPanel record={payment.data} files={files.data || []} instructions={instructions.data || ""} />
      )}
      {payment.data&&<CaseSupport record={payment.data}/>}
      {draft.data && (
        <section className="workspace-panel consultation-draft">
          <span className="status-pill">In progress</span>
          <h2>Your consultation draft</h2>
          <p>
            Your details are saved. Continue from step {draft.data.step + 1} when you are ready. Nothing has
            been submitted to ISG yet.
          </p>
          <Link className="text-link" href="/consultation">
            Continue your request →
          </Link>
        </section>
      )}
      <section className="workspace-panel">
        <h2>Submitted requests</h2>
        {!requests.data.length ? (
          <div className="empty-state">
            <ClipboardList size={30} />
            <h3>Your next step starts here.</h3>
            <p>Submitted consultation requests and their review status will appear here.</p>
          </div>
        ) : (
          <div className="consultation-cards">
            {requests.data.map((r: Consultation) => (
              <article key={r.id}>
                <div>
                  <span className="status-pill">{stageLabel(r.stage)}</span>
                  <time dateTime={r.created_at}>{new Date(r.created_at).toLocaleDateString("en-GB")}</time>
                </div>
                <h3>{r.preferred_fields}</h3>
                <p>{r.study_level}</p>
                <small>{r.reference}</small>
                <Link href={`/contact?topic=consultation&reference=${encodeURIComponent(r.reference)}`}>
                  Ask ISG about this request →
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
      <section className="workspace-panel">
        <h2>Support beyond your first conversation.</h2>
        <p>
          ISG helps you understand your study options, prepare documents and applications, and follow up
          through the application process. Your advisor will explain the agreed support and the next steps.
        </p>
      </section>
    </Workspace>
  );
}
