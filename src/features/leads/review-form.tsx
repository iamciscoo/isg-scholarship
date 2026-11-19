"use client";
import { useActionState } from "react";
import { leadStages, stageLabel } from "@/lib/validation/leads";
import { Button } from "@/components/ui/button";
import { reviewLead } from "./actions";
import type { Lead } from "./types";
export function ReviewForm({ lead }: { lead: Lead }) {
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
        <Button disabled={pending}>{pending ? "Saving…" : "Save status"}</Button>
      </div>
    </form>
  );
}
