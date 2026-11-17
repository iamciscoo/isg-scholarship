export type Role = "applicant" | "advisor" | "admin";
export function canReviewLead(role: Role, userId: string, assignedAdvisorId: string | null, active: boolean) {
  return active && (role === "admin" || (role === "advisor" && assignedAdvisorId === userId));
}
export function canAssignAdvisor(role: Role, active: boolean) {
  return role === "admin" && active;
}
