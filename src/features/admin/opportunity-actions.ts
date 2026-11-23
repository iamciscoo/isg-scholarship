"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/session";
import { promotionSchema } from "@/lib/validation/opportunities";
import type { ActionState } from "@/components/forms/action-form";
const id = (fd: FormData) => z.union([z.uuid(), z.literal("")]).safeParse(String(fd.get("id") || ""));
export async function deletePromotion(_: ActionState, fd: FormData): Promise<ActionState> {
  const { db } = await requireStaff(true);
  const key = id(fd);
  if (!key.success || !key.data) return { error: "Choose a programme to delete." };
  const { error } = await db.rpc("delete_study_promotion", { p_id: key.data });
  if (error) return { error: "The programme could not be deleted. Refresh the list and try again." };
  revalidatePath("/admin/packages");
  revalidatePath("/pathways");
  revalidatePath("/");
  return { message: "Programme deleted." };
}

export async function savePromotion(_: ActionState, fd: FormData): Promise<ActionState> {
  const { db } = await requireStaff(true);
  const key = id(fd);
  const values = Object.fromEntries(
    ["title", "studyLevel", "field", "fundingType", "eligibility", "image"].map((k) => [
      k,
      String(fd.get(k) || ""),
    ]),
  );
  const parsed = promotionSchema.safeParse({
    ...values,
    destinations: fd.getAll("destinations"),
    published: fd.get("published") === "on",
  });
  if (!key.success || !parsed.success)
    return { error: "Check the programme details and select at least one destination." };
  const { error } = await db.rpc("save_study_promotion", { p_id: key.data || null, p_data: parsed.data });
  if (error) return { error: "Programme could not be saved." };
  revalidatePath("/admin/packages");
  revalidatePath("/pathways");
  revalidatePath("/");
  return { message: "Programme saved." };
}
