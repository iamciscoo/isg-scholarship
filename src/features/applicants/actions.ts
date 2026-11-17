"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
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
