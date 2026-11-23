"use client";
import { useWorkspaceText } from "@/lib/i18n/workspace-text";
import type { AssessmentInput } from "@/lib/validation/assessment";
export function AssessmentReview({ values }: { values: AssessmentInput }) {
  const translate = useWorkspaceText();
  const details = [
    ["Name", `${values.firstName} ${values.lastName}`],
    ["Email", values.email],
    ["Phone", values.phone],
    ["Nationality", values.nationality],
    ["Country of residence", values.residence],
    ["Qualification", values.qualification],
    ["Current status", values.educationStatus],
    ["Field of study", values.fieldOfStudy],
    ["Desired study level", values.studyLevel],
    ["Preferred fields", values.preferredFields],
    ["Destinations", values.destinations || "No preference specified"],
    ["Intake", values.intake],
    ["Funding", values.funding],
  ];
  return (
    <dl className="review-grid">
      {details.map(([label, value]) => (
        <div key={label}>
          <dt>{translate(label)}</dt>
          <dd>
            {["Qualification", "Current status", "Desired study level", "Intake", "Funding"].includes(
              label,
            ) ||
            (label === "Destinations" && !values.destinations)
              ? translate(value)
              : value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
