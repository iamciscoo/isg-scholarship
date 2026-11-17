"use server";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { adminClient } from "@/lib/supabase/admin";
type State = { error?: string; message?: string };
export async function uploadAvatar(_previous: State, fd: FormData): Promise<State> {
  const { db, user, profile } = await requireUser();
  const rate = await adminClient().rpc("consume_rate_limit", {
    p_key: `avatar:${user.id}`,
    p_limit: 10,
    p_seconds: 900,
  });
  if (rate.error || !rate.data) return { error: "Please wait 15 minutes before uploading another photo." };
  const file = fd.get("avatar");
  if (!(file instanceof File) || file.size === 0 || file.size > 2 * 1024 * 1024)
    return { error: "Choose a JPEG, PNG or WebP image under 2 MB." };
  let image: Buffer;
  try {
    const input = sharp(Buffer.from(await file.arrayBuffer()), {
      limitInputPixels: 20000000,
      animated: false,
    });
    const metadata = await input.metadata();
    if (!metadata.format || !["jpeg", "png", "webp"].includes(metadata.format))
      return { error: "Choose a JPEG, PNG or WebP image." };
    image = await input.rotate().resize(512, 512, { fit: "cover" }).webp({ quality: 82 }).toBuffer();
  } catch {
    return { error: "This image could not be read. Please choose another photo." };
  }
  const path = `${user.id}/${randomUUID()}.webp`;
  const { error } = await db.storage
    .from("profile-avatars")
    .upload(path, image, { contentType: "image/webp", upsert: false });
  if (error) return { error: "Your photo could not be uploaded. Please try again." };
  const saved = await db.rpc("set_profile_avatar", { p_path: path });
  if (saved.error) {
    await db.storage.from("profile-avatars").remove([path]);
    return { error: "Your profile photo could not be saved." };
  }
  if (profile.avatar_path?.startsWith(`${user.id}/`))
    await db.storage.from("profile-avatars").remove([profile.avatar_path]);
  revalidatePath("/", "layout");
  return { message: "Your profile photo has been updated." };
}
