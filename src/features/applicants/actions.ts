"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { adminClient } from "@/lib/supabase/admin";
import { passwordSchema } from "@/lib/validation/auth";
export type ProfileState = { error?: string; message?: string };
export async function saveProfile(_state: ProfileState, fd: FormData): Promise<ProfileState> {
  const { db, user } = await requireUser();
  const parsed = z
    .object({
      first_name: z.string().trim().min(1).max(80),
      last_name: z.string().trim().min(1).max(80),
      phone: z.string().trim().max(25),
      nationality: z.string().trim().max(80),
      residence: z.string().trim().max(80),
    })
    .safeParse(
      Object.fromEntries(
        ["first_name", "last_name", "phone", "nationality", "residence"].map((key) => [key, fd.get(key)]),
      ),
    );
  if (!parsed.success)
    return { error: "Please check your profile details. First and last names are required." };
  const { error } = await db.from("profiles").update(parsed.data).eq("id", user.id);
  if (error) return { error: "Your profile could not be updated. Please try again." };
  if (fd.get("terms") === "on") {
    const { error: consentError } = await db.rpc("accept_account_terms");
    if (consentError) return { error: "Your consent could not be recorded. Please try again." };
  }
  revalidatePath("/dashboard");
  return { message: "Your profile has been saved." };
}
export type PasswordState = { error?: string; message?: string };
export async function setAccountPassword(_state: PasswordState, fd: FormData): Promise<PasswordState> {
  const { db, user } = await requireUser();
  const password = passwordSchema.safeParse(fd.get("password"));
  if (!password.success) return { error: password.error.issues[0].message };
  if (fd.get("confirmPassword") !== password.data) return { error: "The two passwords must match." };
  const rate = await adminClient().rpc("consume_rate_limit", {
    p_key: `password:${user.id}`,
    p_limit: 5,
    p_seconds: 900,
  });
  if (rate.error || !rate.data) return { error: "Please wait 15 minutes before changing your password again." };
  const { error } = await db.auth.updateUser({ password: password.data });
  if (error) console.error("password_update_failed", { code: error.code });
  if (error) return { error: "Your password could not be saved. Please try again." };
  await adminClient()
    .from("profiles")
    .update({ password_set_at: new Date().toISOString() })
    .eq("id", user.id);
  revalidatePath("/dashboard/profile");
  return { message: "Password saved. You can now sign in with your email and this password." };
}
