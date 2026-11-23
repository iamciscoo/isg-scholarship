"use client";
import { leadStages, stageLabel } from "@/lib/validation/leads";
import { ActionForm } from "@/components/forms/action-form";
import { Text, useWorkspaceText } from "@/lib/i18n/workspace-text";
import { reviewLead } from "./actions";
import type { Lead } from "./types";

export function ReviewForm({ lead }: { lead: Lead }) {
  const t = useWorkspaceText();
  return (
    <ActionForm action={reviewLead} label="Save status">
      <input type="hidden" name="id" value={lead.id} />
      <div className="field">
        <label htmlFor="stage">
          <Text>Review stage</Text>
        </label>
        <select id="stage" name="stage" defaultValue={lead.stage}>
          {leadStages.map((stage) => (
            <option key={stage} value={stage}>
              {t(stageLabel(stage))}
            </option>
          ))}
        </select>
      </div>
    </ActionForm>
  );
}
