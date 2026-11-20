"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth/session";
import type { ActionState } from "@/components/forms/action-form";
export async function saveEmails(
  _state: { error?: string; message?: string },
  fd: FormData,
): Promise<{ error?: string; message?: string }> {
  const { db } = await requireStaff(true);
  const values = String(fd.get("emails") || "")
    .split(/[\n,;]/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const emails = z
    .array(z.email().max(254))
    .max(10)
    .safeParse([...new Set(values)]);
  if (!emails.success) return { error: "Enter up to 10 valid email addresses, one per line." };
  const { error } = await db.rpc("save_admin_alert_emails", { p_emails: emails.data });
  if (error) return { error: "Settings could not be saved." };
  revalidatePath("/admin/settings");
  return { message: "Notification recipients updated." };
}
export async function assignRole(_: ActionState, fd: FormData): Promise<ActionState> {
  const { db } = await requireStaff(true);
  const input = z
    .object({ user: z.uuid(), role: z.enum(["applicant", "advisor", "admin"]) })
    .safeParse({ user: fd.get("user"), role: fd.get("role") });
  if (!input.success) return { error: "Choose a role for an active account." };
  const { user, role } = input.data;
  const { error } = await db.rpc("assign_staff_role", { p_user: user, p_role: role });
  if (error?.message === "Keep at least one administrator")
    return { error: "Assign another active administrator before removing this admin role." };
  if (error?.message === "Account unavailable") return { error: "This account is no longer active." };
  if (error) return { error: "The role could not be saved. Refresh the page and try again." };
  revalidatePath("/admin/settings");
  revalidatePath("/admin/users");
  return {
    message: `Saved as ${role === "admin" ? "Admin" : role === "advisor" ? "Advisor" : "Applicant"}.`,
  };
}

// Form-friendly wrapper for the per-row menu on the users directory.
export async function setUserRole(fd: FormData) {
  const result = await assignRole({}, fd);
  revalidatePath("/admin/users");
  return result;
}
