"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/session";
import { promotionSchema } from "@/lib/validation/opportunities";
import type { ActionState } from "@/components/forms/action-form";
const id = (fd: FormData) => z.union([z.uuid(), z.literal("")]).safeParse(String(fd.get("id") || ""));
export async function savePromotion(_: ActionState, fd: FormData): Promise<ActionState> {
  const { db } = await requireStaff(true);
  const key = id(fd);
  const values = Object.fromEntries(
    ["title", "destination", "studyLevel", "field", "fundingType", "eligibility", "image"].map((k) => [
      k,
      String(fd.get(k) || ""),
    ]),
  );
  const parsed = promotionSchema.safeParse({ ...values, published: fd.get("published") === "on" });
  if (!key.success || !parsed.success)
    return { error: "Check the broad destination, study and eligibility information." };
  if (parsed.data.published && fd.get("reviewed") !== "on")
    return {
      error:
        "Review the public content before publishing. Keep actual scholarship names and internal shortlists private.",
    };
  const { error } = await db.rpc("save_study_promotion", { p_id: key.data || null, p_data: parsed.data });
  if (error) return { error: "Promotion could not be saved." };
  revalidatePath("/admin/promotions");
  revalidatePath("/pathways");
  return { message: "Public promotion settings saved." };
}
