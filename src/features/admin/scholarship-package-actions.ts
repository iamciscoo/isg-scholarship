"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/components/forms/action-form";
import { requireStaff } from "@/lib/auth/session";
import { adminClient } from "@/lib/supabase/admin";
import { scholarshipPackageSchema } from "@/lib/validation/opportunities";
import { validateCaseFile } from "@/server/services/file-validation";

export async function deleteScholarshipPackage(_: ActionState, form: FormData): Promise<ActionState> {
  const { db } = await requireStaff(true);
  const id = z.uuid().safeParse(form.get("id"));
  if (!id.success) return { error: "Choose a package to delete." };
  const { data: imageId, error } = await db.rpc("delete_scholarship_package", { p_id: id.data });
  if (error) {
    if (error.code === "23503")
      return { error: "This package is attached to an application. Archive it instead of deleting." };
    return { error: "The package could not be deleted. Refresh the list and try again." };
  }
  if (imageId) await adminClient().storage.from("scholarship-images").remove([`${imageId}.webp`]);
  revalidatePath("/admin/packages");
  return { message: "Package deleted." };
}

export async function saveScholarshipPackage(_: ActionState, form: FormData): Promise<ActionState> {
  const { db, user } = await requireStaff(true);
  const id = z.union([z.uuid(), z.literal("")]).safeParse(form.get("id"));
  const values = Object.fromEntries(
    [
      "name",
      "provider",
      "destination",
      "studyLevel",
      "field",
      "requirements",
      "deadline",
      "supportSummary",
      "packageFee",
      "providerFee",
      "providerCurrency",
      "image",
    ].map((key) => [key, form.get(key) ?? ""]),
  );
  const file = form.get("privateImage");
  // Server Actions may give an unselected file input a synthetic filename.
  const hasUpload = file instanceof File && file.size > 0;
  const input = scholarshipPackageSchema.safeParse({
    ...values,
    active: form.get("active") === "on",
    useGallery: !hasUpload && form.get("useGallery") === "on",
  });
  if (!id.success || !input.success) return { error: "Check the scholarship details, fees and image." };

  let imageId: string | null = null;
  if (hasUpload) {
    if (
      file.size > 3 * 1024 * 1024 ||
      !["image/jpeg", "image/png", "image/webp"].includes(file.type)
    )
      return { error: "Choose a JPEG, PNG or WebP image up to 3 MB." };
    const admin = adminClient();
    const rate = await admin.rpc("consume_rate_limit", {
      p_key: `scholarship-image:${user.id}`,
      p_limit: 20,
      p_seconds: 900,
    });
    if (rate.error || !rate.data) return { error: "Please wait before uploading more images." };
    const content = await validateCaseFile(file).catch(() => null);
    if (!content || content.mime !== "image/webp")
      return { error: "This image could not be read. Choose another file." };
    imageId = randomUUID();
    const { error } = await admin.storage
      .from("scholarship-images")
      .upload(`${imageId}.webp`, content.data, { contentType: "image/webp", upsert: false });
    if (error) return { error: "The image could not be uploaded. Please try again." };
  }
  const { data: savedId, error } = await db.rpc("save_scholarship_package", {
    p_id: id.data || null,
    p_data: input.data,
    p_image_id: imageId,
  });
  if (error) {
    // Only discard on a confirmed PostgreSQL rejection. A disconnected request may have committed.
    if (imageId && /^(22|23|42|P0)/.test(error.code))
      await adminClient()
        .storage.from("scholarship-images")
        .remove([`${imageId}.webp`]);
    return { error: "The package could not be saved. Check the package list before retrying." };
  }
  revalidatePath("/admin/packages");
  if (!id.data) redirect(`/admin/packages?edit=${savedId}&created=1`);
  return { message: "Scholarship package saved. You can share it from an applicant’s consultation." };
}
