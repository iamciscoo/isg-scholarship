import { ActionForm } from "@/components/forms/action-form";
import type { Advisor } from "@/features/leads/types";
import Link from "next/link";
import { assignConsultationAdvisor } from "./payment-actions";

export function AdvisorAssignment({
  applicant,
  assigned,
  advisors,
}: {
  applicant: string;
  assigned?: string | null;
  advisors: Advisor[];
}) {
  return (
    <section className="workspace-panel">
      <h2>{assigned ? "Assigned advisor" : "Next: assign an advisor"}</h2>
      {!advisors.length ? (
        <p>
          Add an advisor under{" "}
          <Link href="/admin/settings" className="text-link">
            Team settings
          </Link>
          .
        </p>
      ) : (
        <ActionForm action={assignConsultationAdvisor} label={assigned ? "Save advisor" : "Assign advisor"}>
          <input type="hidden" name="user" value={applicant} />
          <label>
            Advisor
            <select name="advisor" defaultValue={assigned || ""} required>
              <option value="">Choose an advisor</option>
              {advisors.map((advisor) => (
                <option key={advisor.id} value={advisor.id}>
                  {`${advisor.first_name || ""} ${advisor.last_name || ""}`.trim() || advisor.email}
                </option>
              ))}
            </select>
          </label>
        </ActionForm>
      )}
    </section>
  );
}
