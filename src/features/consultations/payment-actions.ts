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
  const { error } = await db.rpc("save_payment_instructions", { p_instructions: value.data });
  if (error) return { error: "Payment instructions could not be saved." };
  revalidatePath("/dashboard/consultations");
  revalidatePath("/admin/settings");
  return { message: "Payment instructions updated." };
}
export async function reviewPayment(_: ActionState, fd: FormData): Promise<ActionState> {
  const { db } = await requireStaff(true);
  const value = z
    .object({ id: z.uuid(), approve: z.enum(["true", "false"]), note: z.string().trim().min(3).max(1000) })
    .safeParse(Object.fromEntries(fd));
  if (!value.success) return { error: "Choose a receipt and enter a review note." };
  const { error } = await db.rpc("review_consultation_payment", {
    p_file: value.data.id,
    p_approve: value.data.approve === "true",
    p_note: value.data.note,
  });
  if (error) return { error: "This payment could not be reviewed. It may already have been reviewed." };
  revalidatePath("/admin/payments");
  revalidatePath("/dashboard/consultations");
  return { message: "Payment review recorded." };
}
