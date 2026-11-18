"use server";
import { revalidatePath } from "next/cache";
import { requireUser, requireStaff } from "@/lib/auth/session";
import {
  applicationFields,
  applicationDraftSchema,
  fullApplicationSchema,
} from "@/lib/validation/application-form";
import type { ActionState } from "@/components/forms/action-form";
import { z } from "zod";
export async function saveFullApplication(_: ActionState, fd: FormData): Promise<ActionState> {
  const { db, user } = await requireUser();
  const declare = fd.get("intent") === "declare";
  const values = Object.fromEntries(
    applicationFields.flatMap((s) => s.fields.map((f) => [f.key, String(fd.get(f.key) || "")])),
  );
  const parsed = (declare ? fullApplicationSchema : applicationDraftSchema).safeParse({
    ...values,
    email: user.email,
    guardianPermission: fd.get("guardianPermission") === "on",
  });
  if (!parsed.success)
    return {
      error: parsed.error.issues
        .slice(0, 3)
        .map((i) => `${String(i.path[0])}: ${i.message}`)
        .join(" "),
    };
  if (declare && fd.get("declaration") !== "on")
    return { error: "Accept the declaration before submitting." };
  const { error } = await db.rpc("save_application_form", { p_data: parsed.data, p_declare: declare });
  if (error)
    return {
      error: "Your form could not be saved. A verified payment and completed consultation are required.",
    };
  revalidatePath("/dashboard/application");
  return {
    message: declare
      ? "Declaration accepted. Your submitted PDF is ready below."
      : "Application draft saved.",
  };
}
export async function requestDocument(_: ActionState, fd: FormData): Promise<ActionState> {
  const { db } = await requireStaff();
  const parsed = z
    .object({
      user: z.uuid(),
      category: z.enum(["passport", "certificates", "transcripts", "photo", "other"]),
      label: z.string().trim().min(1).max(160),
      note: z.string().trim().max(1000),
    })
    .safeParse({
      user: fd.get("user"),
      category: fd.get("category"),
      label: fd.get("label"),
      note: fd.get("note"),
    });
  if (!parsed.success) return { error: "Enter a document category, label and any instructions." };
  const x = parsed.data;
  const { error } = await db.rpc("set_document_request", {
    p_user: x.user,
    p_category: x.category,
    p_label: x.label,
    p_required: fd.get("required") === "on",
    p_note: x.note,
  });
  if (error) return { error: "Document request could not be saved." };
  revalidatePath("/dashboard/application");
  revalidatePath(`/admin/cases/${x.user}`);
  revalidatePath(`/advisor/cases/${x.user}`);
  return { message: "Document request updated." };
}
export async function reviewDocument(_: ActionState, fd: FormData): Promise<ActionState> {
  const { db } = await requireStaff();
  const x = z
    .object({
      id: z.uuid(),
      user: z.uuid(),
      approve: z.enum(["true", "false"]),
      note: z.string().trim().min(3).max(1000),
    })
    .safeParse(Object.fromEntries(fd));
  if (!x.success) return { error: "Choose a decision and enter a note." };
  const { error } = await db.rpc("review_application_document", {
    p_file: x.data.id,
    p_approve: x.data.approve === "true",
    p_note: x.data.note,
  });
  if (error) return { error: "The document could not be reviewed." };
  revalidatePath("/dashboard/application");
  revalidatePath(`/admin/cases/${x.data.user}`);
  revalidatePath(`/advisor/cases/${x.data.user}`);
  return { message: "Document review saved." };
}
