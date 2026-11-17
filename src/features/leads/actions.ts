"use server";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth/session";
import { leadReviewSchema } from "@/lib/validation/leads";
import { canReviewLead, canAssignAdvisor } from "@/lib/auth/permissions";
export type ReviewState = { error?: string; message?: string };
export async function reviewLead(_state: ReviewState, fd: FormData): Promise<ReviewState> {
  const { db, user, role } = await requireStaff();
  const parsed = leadReviewSchema.safeParse({
    id: fd.get("id"),
    stage: fd.get("stage"),
    reason: fd.get("reason"),
    advisorId: fd.get("advisorId"),
    followUp: fd.get("followUp"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const data = parsed.data;
  const { data: lead } = await db.from("leads").select("advisor_id").eq("id", data.id).single();
  if (!lead || !canReviewLead(role, user.id, lead.advisor_id, true))
    return { error: "You no longer have permission to review this lead." };
  if ((data.advisorId || null) !== lead.advisor_id && !canAssignAdvisor(role, true))
    return { error: "Only administrators can change advisor assignments." };
  const { error } = await db.rpc("review_lead", {
    p_id: data.id,
    p_stage: data.stage,
    p_reason: data.reason,
    p_advisor: data.advisorId || null,
    p_follow_up: data.followUp || null,
  });
  if (error)
    return {
      error:
        "The review could not be saved. Check that you still have access and that the advisor is active.",
    };
  revalidatePath("/admin");
  revalidatePath("/advisor");
  revalidatePath(`/admin/leads/${data.id}`);
  revalidatePath(`/advisor/leads/${data.id}`);
  return { message: "Review saved and recorded in the audit history." };
}
