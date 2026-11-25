export const fullApplicationStatusLabels = {
  submitted: "Submitted",
  in_review: "In review",
  needs_information: "Information requested",
  approved: "Approved by ISG",
  declined: "Declined by ISG",
  applying: "Applying",
  waiting: "Waiting for decision",
  accepted: "Accepted",
  rejected: "Rejected",
  completed: "Completed",
  cancelled: "Cancelled",
} as const;

export type FullApplicationStatus = keyof typeof fullApplicationStatusLabels;
export const fullApplicationStatuses = (
  Object.keys(fullApplicationStatusLabels) as FullApplicationStatus[]
).filter(
  // Statuses staff can set on a submitted application; the rest are legacy or internal.
  (status) => !["submitted", "in_review", "needs_information", "approved", "declined"].includes(status),
);

export function fullApplicationStatusLabel(status: string) {
  return fullApplicationStatusLabels[status as FullApplicationStatus] || "Submitted";
}

export const applicationDocumentCategories = {
  passport: "Passport",
  certificates: "Education certificates",
  transcripts: "Academic transcripts",
  photo: "Passport-size photograph",
  achievements: "Achievement certificates",
  other: "Other supporting documents",
} as const;

export type ApplicationDocumentCategory = keyof typeof applicationDocumentCategories;
export const applicationDocumentKeys = Object.keys(
  applicationDocumentCategories,
) as ApplicationDocumentCategory[];

export type FullApplicationUpdate = {
  id: string;
  status: FullApplicationStatus;
  note: string;
  created_at: string;
};
