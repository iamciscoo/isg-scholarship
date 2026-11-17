"use client";
import { useActionState } from "react";
import { leadStages, stageLabel } from "@/lib/validation/leads";
import { Button } from "@/components/ui/button";
import { reviewLead } from "./actions";
import type { Advisor, Lead } from "./types";
export function ReviewForm({ lead, advisors, admin }: { lead: Lead; advisors: Advisor[]; admin: boolean }) {
  const [state, action, pending] = useActionState(reviewLead, {});
  return (
    <form action={action} className="form-stack">
      <input type="hidden" name="id" value={lead.id} />
      <div className="form-grid">
        <div className="field">
          <label htmlFor="stage">Review stage</label>
          <select id="stage" name="stage" defaultValue={lead.stage}>
            {leadStages.map((stage) => (
              <option key={stage} value={stage}>
                {stageLabel(stage)}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="followUp">Follow-up date (optional)</label>
          <input type="date" name="followUp" id="followUp" defaultValue={lead.follow_up || ""} />
        </div>
        {admin ? (
          <div className="field form-full">
            <label htmlFor="advisorId">Assigned advisor</label>
            <select name="advisorId" id="advisorId" defaultValue={lead.advisor_id || ""}>
              <option value="">Not assigned</option>
              {advisors.map((advisor) => (
                <option key={advisor.id} value={advisor.id}>
                  {`${advisor.first_name} ${advisor.last_name}`.trim() || advisor.id}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <input type="hidden" name="advisorId" value={lead.advisor_id || ""} />
        )}
      </div>
      <div className="field">
        <label htmlFor="reason">Internal review notes / reason</label>
        <textarea name="reason" id="reason" required minLength={5} maxLength={1500} />
        <span className="field-help">
          Private to authorized staff. Record the reason for the stage or assignment change. Do not record
          portal passwords.
        </span>
      </div>
      {state.error && (
        <p role="alert" className="notice notice-error">
          {state.error}
        </p>
      )}
      {state.message && (
        <p role="status" className="form-message">
          {state.message}
        </p>
      )}
      <div>
        <Button disabled={pending}>{pending ? "Saving review…" : "Save review"}</Button>
      </div>
    </form>
  );
}
