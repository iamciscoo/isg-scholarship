"use server";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth/session";
import { leadReviewSchema } from "@/lib/validation/leads";
import { canReviewLead } from "@/lib/auth/permissions";
export type ReviewState = { error?: string; message?: string };
export async function reviewLead(_state: ReviewState, fd: FormData): Promise<ReviewState> {
  const { db, user, role } = await requireStaff();
  const parsed = leadReviewSchema.safeParse({
    id: fd.get("id"),
    stage: fd.get("stage"),
    followUp: fd.get("followUp"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const data = parsed.data;
  const { data: lead } = await db.from("leads").select("advisor_id").eq("id", data.id).single();
  if (!lead || !canReviewLead(role, user.id, lead.advisor_id, true))
    return { error: "You no longer have permission to review this lead." };
  const { error } = await db.rpc("review_lead", {
    p_id: data.id,
    p_stage: data.stage,
    p_reason: "",
    p_advisor: lead.advisor_id,
    p_follow_up: data.followUp || null,
  });
  if (error)
    return {
      error: "The status could not be saved. Refresh the consultation and try again.",
    };
  revalidatePath("/admin");
  revalidatePath("/advisor");
  revalidatePath(`/admin/leads/${data.id}`);
  revalidatePath(`/advisor/leads/${data.id}`);
  return { message: "Consultation status saved." };
}
