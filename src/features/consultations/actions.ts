"use server";
import { revalidatePath } from "next/cache";
import { assessmentSchema } from "@/lib/validation/assessment";
import { requireUser } from "@/lib/auth/session";
import { z } from "zod";
export async function saveConsultationDraft(values: unknown, step: number) {
  const { db, user } = await requireUser();
  const parsed = assessmentSchema.partial().safeParse(values);
  if (!parsed.success || !z.number().int().min(1).max(3).safeParse(step).success)
    return { error: "Please check the details in this step." };
  const data = { ...parsed.data, email: user.email || "" };
  const { error } = await db.rpc("save_my_consultation_draft", { p_data: data, p_step: step });
  if (error?.code === "23505") return { existing: true };
  if (error) return { error: "Your progress and profile details could not be saved. Please try again." };
  revalidatePath("/dashboard");
  return { message: "Progress saved to your account." };
}
