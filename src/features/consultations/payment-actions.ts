"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/session";
import type { ActionState } from "@/components/forms/action-form";
export async function savePaymentInstructions(_: ActionState, fd: FormData): Promise<ActionState> {
  const { db } = await requireStaff(true);
  const value = z.string().trim().min(10).max(5000).safeParse(fd.get("instructions"));
  if (!value.success)
    return {
      error: "Enter clear payment instructions, including the bank/network, account name and reference.",
    };
  const rpc =
    fd.get("type") === "package" ? "save_package_payment_instructions" : "save_payment_instructions";
  const { error } = await db.rpc(rpc, { p_instructions: value.data });
  if (error) return { error: "Payment instructions could not be saved." };
  revalidatePath("/dashboard/consultations");
  revalidatePath("/dashboard/applications/[id]", "page");
  revalidatePath("/admin/settings");
  return { message: "Payment instructions updated." };
}
export async function reviewPayment(_: ActionState, fd: FormData): Promise<ActionState> {
  const { db } = await requireStaff(true);
  const value = z
    .object({ id: z.uuid(), approve: z.enum(["true", "false"]), note: z.string().trim().max(1000) })
    .safeParse({ id: fd.get("id"), approve: fd.get("approve"), note: fd.get("note") || "" });
  if (!value.success) return { error: "Choose a decision for this receipt." };
  const { error } = await db.rpc("review_payment_receipt", {
    p_file: value.data.id,
    p_approve: value.data.approve === "true",
    p_feedback: value.data.note,
  });
  if (error?.message === "Already reviewed")
    return { error: "This receipt has already been reviewed. Refresh to see its current status." };
  if (error?.message === "Receipt unavailable") return { error: "This receipt is no longer available." };
  if (error) {
    console.error("receipt_review_failed", { code: error.code });
    return { error: "The review could not be saved. Please try again." };
  }
  revalidatePath("/admin/payments");
  revalidatePath("/admin/cases/[id]", "page");
  revalidatePath("/dashboard/consultations");
  revalidatePath("/dashboard/applications");
  revalidatePath("/dashboard/applications/[id]", "page");
  revalidatePath(`/admin/receipts/${value.data.id}`);
  return {
    message: value.data.approve === "true" ? "Payment verified." : "Receipt returned for correction.",
  };
}

export async function assignConsultationAdvisor(_: ActionState, form: FormData): Promise<ActionState> {
  const { db } = await requireStaff(true);
  const input = z.object({ user: z.uuid(), advisor: z.uuid() }).safeParse(Object.fromEntries(form));
  if (!input.success) return { error: "Choose an advisor." };
  const { user, advisor } = input.data;
  const { error } = await db.rpc("assign_consultation_advisor", { p_user: user, p_advisor: advisor });
  if (error) return { error: "Verify the consultation payment and choose an active advisor." };
  revalidatePath(`/admin/cases/${user}`);
  revalidatePath("/admin/consultations");
  revalidatePath("/dashboard/consultations");
  return { message: "Advisor assigned. The applicant can now request meetings and send messages." };
}
