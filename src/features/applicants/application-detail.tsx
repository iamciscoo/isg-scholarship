import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { z } from "zod";
import { usdLabel } from "@/lib/format";
import { requireUser, requireStaff } from "@/lib/auth/session";
import { Workspace } from "@/components/layout/workspace";
import { ActionForm } from "@/components/forms/action-form";
import {
  applicationStatuses,
  isPreviewPackage,
  providerDecisions,
  proposalSchema,
} from "@/lib/validation/opportunities";
import { approveApplication, updateApplication, commitPlace } from "./tracking-actions";
import { PackageProgress } from "./package-progress";
import { packageStatus } from "./package-status";
export async function ApplicationDetail({
  id,
  historyPage = 1,
  staff = false,
  admin = false,
}: {
  id: string;
  historyPage?: number;
  staff?: boolean;
  admin?: boolean;
}) {
  const { db, user, role } = staff ? await requireStaff(admin) : await requireUser();
  if (!z.uuid().safeParse(id).success) notFound();
  const { data: a, error } = await db.from("study_applications").select("*").eq("id", id).maybeSingle();
  if (error) throw Error("Application unavailable");
  if (!a || (!staff && a.user_id !== user.id)) notFound();
  const p = proposalSchema.safeParse(a.proposal);
  if (!p.success) throw Error("Proposal details unavailable");
  const page = Math.max(1, Math.min(100000, Math.floor(historyPage) || 1));
  const history = await db
    .from("study_application_history")
    .select("id,status,provider_decision,note,created_at", { count: "exact" })
    .eq("application_id", id)
    .order("created_at", { ascending: false })
    .order("id")
    .range((page - 1) * 20, page * 20 - 1);
  if (history.error) throw Error("Application history unavailable");
  const base = staff ? (admin ? "/admin/applications" : "/advisor/applications") : "/dashboard/applications";
  const canWork = !a.package_state || a.package_state === "paid";
  return (
    <Workspace role={role} email={user.email || ""} active="applications">
      <Link href={base} className="text-link">
        ← All applications
      </Link>
      <h1>{p.data.name}</h1>
      <p>
        {p.data.provider} · {p.data.destination} · {p.data.studyLevel}
      </p>
      <div className="operation-grid">
        <section className="workspace-panel">
          <span className="status-pill">{packageStatus(a.package_state, a.status)}</span>
          <h2>Scholarship package</h2>
          {p.data.image && (
            <div className="approved-image-preview">
              <Image
                src={p.data.image}
                alt=""
                fill
                sizes="320px"
                unoptimized={p.data.image.startsWith("/api/scholarship-images/")}
              />
            </div>
          )}
          <p>Field: {p.data.field}</p>
          <p>Provider deadline: {p.data.deadline || "Confirm with advisor"}</p>
          {p.data.requirements && (
            <>
              <h3>Requirements</h3>
              <p className="preserve-lines">{p.data.requirements}</p>
            </>
          )}
          {p.data.supportSummary && (
            <>
              <h3>Included ISG support</h3>
              <p className="preserve-lines">{p.data.supportSummary}</p>
            </>
          )}
          <dl className="package-fees">
            <div>
              <dt>ISG package fee</dt>
              <dd>
                {p.data.packageFee === undefined ? (
                  "Ask your advisor"
                ) : (
                  <>
                    TZS {p.data.packageFee.toLocaleString("en")}
                    <small>{usdLabel(p.data.packageFee)}</small>
                  </>
                )}
              </dd>
            </div>
            <div>
              <dt>University or provider fee</dt>
              <dd>
                {p.data.providerFee === null
                  ? "To be confirmed"
                  : `${p.data.providerCurrency} ${p.data.providerFee.toLocaleString("en")}`}
              </dd>
            </div>
          </dl>
          {p.data.packageFee !== undefined && <p>The TZS 50,000 consultation fee is separate.</p>}
          {!a.package_state && <p>Approval: {a.approval}</p>}
          {!staff && !a.package_state && a.approval === "pending" && (
            <ActionForm action={approveApplication} label="Record my decision">
              <input type="hidden" name="id" value={id} />
              <label>
                Decision
                <select name="approve" required>
                  <option value="">Select decision</option>
                  <option value="true">Approve this package and proceed</option>
                  <option value="false">Decline this package</option>
                </select>
              </label>
              <p>
                To approve, first{" "}
                <Link className="text-link" href="/dashboard/application">
                  submit your application form
                </Link>
                .
              </p>
            </ActionForm>
          )}
        </section>
        {a.package_state && (
          <PackageProgress
            id={id}
            state={a.package_state}
            status={a.status}
            fee={p.data.packageFee}
            staff={staff}
            admin={admin}
            testPackage={isPreviewPackage(p.data.name)}
          />
        )}
        {canWork && (
          <section className="workspace-panel">
            <h2>Official provider decision</h2>
            <strong>{a.provider_decision}</strong>
            <p>{a.provider_decision_date || "No official decision date recorded."}</p>
            <p className="preserve-lines">{a.provider_evidence}</p>
            <h3>Next steps</h3>
            <p>{a.next_step || "Your advisor will confirm the next step."}</p>
            {a.next_date && <p>Next action date: {a.next_date}</p>}
            {!staff && a.status === "Accepted" && (
              <ActionForm action={commitPlace} label="Confirm my commitment">
                <input type="hidden" name="id" value={id} />
                <label className="checkbox-field">
                  <input name="confirm" type="checkbox" required />I confirm that I am committing to this
                  accepted place.
                </label>
                <label className="checkbox-field">
                  <input name="closeOthers" type="checkbox" />
                  Close my other active ISG application workflows. ISG must confirm any separate provider
                  withdrawals.
                </label>
              </ActionForm>
            )}
          </section>
        )}
      </div>
      {staff && canWork && (
        <section className="workspace-panel">
          <h2>Record a workflow update</h2>
          <ActionForm action={updateApplication} label="Save dated update">
            <input type="hidden" name="id" value={id} />
            <div className="form-grid">
              <label>
                ISG workflow
                <select name="status" defaultValue={a.status}>
                  {applicationStatuses.map((s) => (
                    <option key={s} disabled={s === "Completed" && a.status !== "Completed"}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Official provider decision
                <select name="decision" defaultValue={a.provider_decision}>
                  {providerDecisions.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label>
                Official decision date
                <input name="decisionDate" type="date" defaultValue={a.provider_decision_date || ""} />
              </label>
              <label>
                Next action date
                <input name="nextDate" type="date" defaultValue={a.next_date || ""} />
              </label>
            </div>
            <label>
              Official decision source / evidence summary
              <textarea name="evidence" defaultValue={a.provider_evidence} maxLength={2000} />
            </label>
            <label>
              History note visible to applicant
              <textarea name="note" minLength={3} maxLength={2000} required />
            </label>
            <label>
              Next step
              <textarea name="next" defaultValue={a.next_step} maxLength={1000} />
            </label>
            <p>
              Official outcomes must be supported by the provider’s decision. Only applicants can mark a place
              Completed by confirming commitment.
            </p>
          </ActionForm>
        </section>
      )}
      <section className="workspace-panel">
        <h2>Application history</h2>
        <ol className="notification-history">
          {history.data?.map((h) => (
            <li key={h.id}>
              <strong>{h.status}</strong>
              <p>{h.note}</p>
              <p>Provider: {h.provider_decision}</p>
              <time>{new Date(h.created_at).toISOString()}</time>
            </li>
          ))}
        </ol>
        <div className="pagination">
          {page > 1 && <Link href={`${base}/${id}?page=${page - 1}`}>← Previous</Link>}
          {page * 20 < (history.count || 0) && (
            <Link href={`${base}/${id}?page=${page + 1}`}>Older updates →</Link>
          )}
        </div>
      </section>
    </Workspace>
  );
}
