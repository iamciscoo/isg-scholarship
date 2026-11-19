"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser, requireStaff } from "@/lib/auth/session";
import { applicationStatuses, providerDecisions } from "@/lib/validation/opportunities";
import type { ActionState } from "@/components/forms/action-form";
function refresh(id?: string) {
  for (const p of ["/dashboard/applications", "/admin/applications", "/advisor/applications"])
    revalidatePath(p);
  if (id)
    for (const p of ["/dashboard/applications/", "/admin/applications/", "/advisor/applications/"])
      revalidatePath(p + id);
}
export async function proposeApplication(_: ActionState, fd: FormData): Promise<ActionState> {
  const { db } = await requireStaff();
  const x = z.object({ user: z.uuid(), opportunity: z.uuid() }).safeParse(Object.fromEntries(fd));
  if (!x.success) return { error: "Choose a scholarship package." };
  const { error } = await db.rpc("propose_application", {
    p_user: x.data.user,
    p_opportunity: x.data.opportunity,
  });
  if (error)
    return {
      error: "Check that the package is active and the consultation is complete, then try again.",
    };
  refresh();
  return { message: "Package shared in the applicant’s workspace for review." };
}
export async function approveApplication(_: ActionState, fd: FormData): Promise<ActionState> {
  const { db } = await requireUser();
  const x = z.object({ id: z.uuid(), approve: z.enum(["true", "false"]) }).safeParse(Object.fromEntries(fd));
  if (!x.success) return { error: "Choose an approval decision." };
  const { error } = await db.rpc("approve_application", {
    p_application: x.data.id,
    p_approve: x.data.approve === "true",
  });
  if (error)
    return {
      error: "Your decision could not be saved. To approve, first submit your application form.",
    };
  refresh(x.data.id);
  return { message: "Your decision has been saved." };
}
export async function updateApplication(_: ActionState, fd: FormData): Promise<ActionState> {
  const { db } = await requireStaff();
  const date = z.union([z.iso.date(), z.literal("")]);
  const x = z
    .object({
      id: z.uuid(),
      status: z.enum(applicationStatuses),
      decision: z.enum(providerDecisions),
      decisionDate: date,
      evidence: z.string().trim().max(2000),
      note: z.string().trim().min(3).max(2000),
      next: z.string().trim().max(1000),
      nextDate: date,
    })
    .safeParse(Object.fromEntries(fd));
  if (!x.success) return { error: "Check the status, official decision, dates and history note." };
  const d = x.data;
  const { error } = await db.rpc("update_study_application", {
    p_application: d.id,
    p_status: d.status,
    p_decision: d.decision,
    p_decision_date: d.decisionDate || null,
    p_evidence: d.evidence,
    p_note: d.note,
    p_next: d.next,
    p_next_date: d.nextDate || null,
  });
  if (error)
    return {
      error:
        "Update refused. Check applicant approval, required documents, allowed workflow transitions and official decision evidence. Only the applicant can confirm commitment to a place.",
    };
  refresh(d.id);
  return { message: "Application history and next steps updated. Service notifications are queued." };
}
export async function commitPlace(_: ActionState, fd: FormData): Promise<ActionState> {
  const { db } = await requireUser();
  const x = z.uuid().safeParse(fd.get("id"));
  if (!x.success || fd.get("confirm") !== "on")
    return { error: "Confirm that you are committing to this accepted place." };
  const { error } = await db.rpc("commit_study_place", {
    p_application: x.data,
    p_close_others: fd.get("closeOthers") === "on",
  });
  if (error) return { error: "Only your own accepted application can be completed." };
  refresh(x.data);
  return {
    message: "Your commitment is recorded. ISG will confirm any required provider withdrawals separately.",
  };
}
