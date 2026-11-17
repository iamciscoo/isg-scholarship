"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth/session";
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
export async function assignRole(fd: FormData) {
  const { db } = await requireStaff(true);
  const id = z.uuid().parse(fd.get("user"));
  const role = z.enum(["applicant", "advisor", "admin"]).parse(fd.get("role"));
  const { error } = await db.rpc("assign_staff_role", { p_user: id, p_role: role });
  if (error) throw new Error("Role update refused. Keep at least one active administrator.");
  revalidatePath("/admin/settings");
}
