"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/session";
import { adminClient } from "@/lib/supabase/admin";
import { validateCaseFile } from "@/server/services/file-validation";
import { marketingImageSchema } from "@/lib/validation/opportunities";
import type { ActionState } from "@/components/forms/action-form";
import type { MarketingImage } from "@/server/repositories/marketing-images";
export type MarketingUploadState = ActionState & { image?: MarketingImage };
export async function uploadMarketingImage(
  _: MarketingUploadState,
  fd: FormData,
): Promise<MarketingUploadState> {
  const { user } = await requireStaff(true);
  const label = z.string().trim().min(1).max(140).safeParse(fd.get("label"));
  const file = fd.get("file");
  if (
    !label.success ||
    !(file instanceof File) ||
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size > 3 * 1024 * 1024
  )
    return { error: "Choose a JPEG, PNG or WebP under 3 MB and give it a short public label." };
  const admin = adminClient();
  const rate = await admin.rpc("consume_rate_limit", {
    p_key: `marketing-upload:${user.id}`,
    p_limit: 20,
    p_seconds: 900,
  });
  if (rate.error || !rate.data) return { error: "Please wait before uploading more images." };
  try {
    const content = await validateCaseFile(file);
    if (content.mime !== "image/webp") return { error: "Choose an image, not a document." };
    const id = randomUUID(),
      path = `${id}.webp`;
    const upload = await admin.storage
      .from("marketing-images")
      .upload(path, content.data, { contentType: "image/webp", upsert: false });
    if (upload.error) return { error: "The image could not be uploaded." };
    const record = await admin.rpc("register_marketing_image", {
      p_id: id,
      p_actor: user.id,
      p_label: label.data,
    });
    if (record.error) {
      await admin.storage.from("marketing-images").remove([path]);
      return { error: "The image could not be registered. Please try again." };
    }
    revalidatePath("/admin/website");
    return {
      message: "Public marketing image uploaded.",
      image: { id, path: `/api/marketing-images/${id}`, label: label.data },
    };
  } catch {
    return { error: "This image could not be read. Please choose another image." };
  }
}
export async function deleteMarketingImage(_: ActionState, fd: FormData): Promise<ActionState> {
  const { db } = await requireStaff(true);
  const id = z.uuid().safeParse(fd.get("id"));
  if (!id.success) return { error: "Choose an image to remove." };
  const result = await db.rpc("delete_marketing_image", { p_id: id.data });
  if (result.error) {
    const text = result.error.message || "";
    return {
      error: /^(This image|Image not found)/.test(text)
        ? text
        : "The image could not be removed. Refresh and try again.",
    };
  }
  if (typeof result.data === "string")
    await adminClient().storage.from("marketing-images").remove([result.data]);
  revalidatePath("/admin/website");
  revalidatePath("/");
  return { message: "Image removed." };
}

export async function saveHomepageImage(_: ActionState, fd: FormData): Promise<ActionState> {
  const { db } = await requireStaff(true);
  const image = marketingImageSchema.safeParse(fd.get("image"));
  if (!image.success) return { error: "Choose an approved image." };
  const { error } = await db.rpc("set_homepage_image", { p_image: image.data });
  if (error) return { error: "The homepage image could not be saved." };
  revalidatePath("/");
  revalidatePath("/admin/website");
  return { message: "Homepage image updated." };
}
