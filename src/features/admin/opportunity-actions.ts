"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/session";
import { opportunitySchema, promotionSchema } from "@/lib/validation/opportunities";
import type { ActionState } from "@/components/forms/action-form";
const id = (fd: FormData) => z.union([z.uuid(), z.literal("")]).safeParse(String(fd.get("id") || ""));
export async function saveOpportunity(_: ActionState, fd: FormData): Promise<ActionState> {
  const { db } = await requireStaff(true);
  const key = id(fd);
  const values = Object.fromEntries(
    [
      "name",
      "provider",
      "destination",
      "studyLevel",
      "field",
      "requirements",
      "staffNotes",
      "deadline",
      "sourceUrl",
      "providerFee",
      "providerCurrency",
      "image",
    ].map((k) => [k, String(fd.get(k) || "")]),
  );
  const parsed = opportunitySchema.safeParse({ ...values, active: fd.get("active") === "on" });
  if (!key.success || !parsed.success)
    return { error: "Check the opportunity fields, source URL, fee and image." };
  const { error } = await db.rpc("save_opportunity", { p_id: key.data || null, p_data: parsed.data });
  if (error) return { error: "The private opportunity could not be saved." };
  revalidatePath("/admin/opportunities");
  return { message: "Private opportunity saved. It has not been published publicly." };
}
export async function savePackage(_: ActionState, fd: FormData): Promise<ActionState> {
  const { db } = await requireStaff(true);
  const key = id(fd);
  const parsed = z
    .object({
      name: z.string().trim().min(1).max(160),
      description: z.string().trim().max(3000),
      price: z.coerce.number().int().min(50000).max(100000000),
    })
    .safeParse({ name: fd.get("name"), description: fd.get("description"), price: fd.get("price") });
  if (!key.success || !parsed.success)
    return {
      error:
        "Enter a package name, description and ISG price of at least TZS 50,000, which includes the consultation fee.",
    };
  const x = parsed.data;
  const { error } = await db.rpc("save_service_package", {
    p_id: key.data || null,
    p_name: x.name,
    p_description: x.description,
    p_price: x.price,
    p_active: fd.get("active") === "on",
    p_promoted: fd.get("promoted") === "on",
  });
  if (error) return { error: "Package could not be saved." };
  revalidatePath("/admin/packages");
  revalidatePath("/dashboard/applications");
  revalidatePath("/pricing");
  return { message: "Service-package price saved. Provider fees remain separate." };
}
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
