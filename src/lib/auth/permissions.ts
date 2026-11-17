export type Role = "applicant" | "advisor" | "admin";
export function canReviewLead(
  role: Role,
  userId: string,
  assignedAdvisorId: string | null,
  active: boolean,
  aal: string,
) {
  return (
    active && aal === "aal2" && (role === "admin" || (role === "advisor" && assignedAdvisorId === userId))
  );
}
export function canAssignAdvisor(role: Role, active: boolean, aal: string) {
  return role === "admin" && active && aal === "aal2";
}
