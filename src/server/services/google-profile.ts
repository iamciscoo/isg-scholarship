import "server-only";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { adminClient } from "@/lib/supabase/admin";

/**
 * Google hands us a name and a picture. Fill anything the profile is missing, once, on first sign-in.
 * Never overwrite details the applicant typed themselves.
 */
export async function importGoogleProfile(
  userId: string,
  metadata: Record<string, unknown> | undefined,
) {
  if (!metadata) return;
  const db = adminClient();
  const { data: profile } = await db
    .from("profiles")
    .select("first_name,last_name,avatar_path")
    .eq("id", userId)
    .maybeSingle();
  if (!profile) return;

  const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
  let given = text(metadata.given_name);
  let family = text(metadata.family_name);
  const whole = text(metadata.full_name) || text(metadata.name);
  if (!given && whole) {
    given = whole.split(" ")[0];
    family = family || whole.slice(given.length).trim();
  }
  const patch: Record<string, string> = {};
  if (!profile.first_name && given) patch.first_name = given;
  if (!profile.last_name && family) patch.last_name = family;

  const picture = text(metadata.avatar_url) || text(metadata.picture);
  if (!profile.avatar_path && picture.startsWith("https://")) {
    try {
      const response = await fetch(picture, { signal: AbortSignal.timeout(8000) });
      if (response.ok) {
        const source = Buffer.from(await response.arrayBuffer());
        const image = await sharp(source, { limitInputPixels: 20000000 })
          .rotate()
          .resize(512, 512, { fit: "cover" })
          .webp({ quality: 82 })
          .toBuffer();
        const path = `${userId}/${randomUUID()}.webp`;
        const { error } = await db.storage
          .from("profile-avatars")
          .upload(path, image, { contentType: "image/webp", upsert: false });
        if (!error) patch.avatar_path = path;
      }
    } catch {
      // A missing avatar must never block sign-in.
    }
  }
  if (Object.keys(patch).length) await db.from("profiles").update(patch).eq("id", userId);
}