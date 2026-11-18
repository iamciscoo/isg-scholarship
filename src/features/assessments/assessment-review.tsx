import type { AssessmentInput } from "@/lib/validation/assessment";
export function AssessmentReview({ values }: { values: AssessmentInput }) {
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
    ["General considerations", values.constraints || "None provided"],
  ];
  return (
    <dl className="review-grid">
      {details.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
