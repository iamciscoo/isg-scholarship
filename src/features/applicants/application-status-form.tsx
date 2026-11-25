import { getWorkspaceText } from "@/lib/i18n/server";
import { Text } from "@/lib/i18n/workspace-text";
import { ActionForm } from "@/components/forms/action-form";
import { fullApplicationStatusLabel, fullApplicationStatuses } from "@/lib/validation/application-review";
import { reviewFullApplication } from "./application-actions";

export async function ApplicationStatusForm({ declaration, status }: { declaration: string; status: string }) {
  const translate = await getWorkspaceText();
  return (
    <section className="workspace-panel">
      <h2>
        <Text>{"Application status"}</Text>
      </h2>
      <ActionForm action={reviewFullApplication} label="Save status">
        <input name="declaration" type="hidden" value={declaration} />
        <input name="previous" type="hidden" value={status} />
        <label>
          <Text>{"Application status"}</Text>
          <select name="status" defaultValue={status}>
            {fullApplicationStatuses
              .filter((value) => value === status || !["approved", "declined"].includes(value))
              .map((value) => (
                <option key={value} value={value}>
                  {fullApplicationStatusLabel(value)}
                </option>
              ))}
          </select>
        </label>
        <label>
          <Text>{"Note for the applicant (optional)"}</Text>
          <textarea
            name="note"
            maxLength={2000}
            placeholder={translate("Add instructions if the applicant needs to do something.")}
          />
        </label>
      </ActionForm>
    </section>
  );
}
