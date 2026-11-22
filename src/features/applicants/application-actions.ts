"use server";
import { revalidatePath } from "next/cache";
import { requireUser, requireStaff } from "@/lib/auth/session";
import {
  applicationFields,
  applicationDraftSchema,
  fullApplicationSchema,
} from "@/lib/validation/application-form";
import type { ActionState } from "@/components/forms/action-form";
import { applicationDocumentKeys, fullApplicationStatuses } from "@/lib/validation/application-review";
import { wakeNotifications } from "@/server/services/notification-delivery";
import { z } from "zod";

function refreshApplication(user?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/application");
  revalidatePath("/admin/applications");
  revalidatePath("/advisor/applications");
  revalidatePath("/admin/declarations/[id]", "page");
  revalidatePath("/advisor/declarations/[id]", "page");
  if (user) {
    revalidatePath(`/admin/cases/${user}`);
    revalidatePath(`/advisor/cases/${user}`);
  }
}

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
  if (!parsed.success) {
    const fields = applicationFields.flatMap((section) => section.fields);
    return {
      error: parsed.error.issues
        .slice(0, 3)
        .map(
          (i) => `${fields.find((f) => f.key === i.path[0])?.label || "Guardian permission"}: ${i.message}`,
        )
        .join(" "),
    };
  }
  if (declare && fd.get("declaration") !== "on")
    return { error: "Accept the declaration before submitting." };
  const { error } = await db.rpc("save_application_form", { p_data: parsed.data, p_declare: declare });
  if (error?.message === "Application review is closed")
    return { error: "This application review is closed. Contact your advisor if you need to make changes." };
  if (error)
    return {
      error: "Your form could not be saved. A verified payment and completed consultation are required.",
    };
  if (declare) {
    wakeNotifications();
    refreshApplication(user.id);
  } else {
    revalidatePath("/dashboard/application");
  }
  return {
    message: declare ? "Application submitted. You can track its review here." : "Application draft saved.",
  };
}
export async function requestDocument(_: ActionState, fd: FormData): Promise<ActionState> {
  const { db } = await requireStaff();
  const parsed = z
    .object({
      user: z.uuid(),
      category: z.enum(applicationDocumentKeys),
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
  wakeNotifications();
  refreshApplication(x.user);
  return { message: "Document request updated." };
}
export async function reviewDocument(_: ActionState, fd: FormData): Promise<ActionState> {
  const { db } = await requireStaff();
  const x = z
    .object({
      id: z.uuid(),
      user: z.uuid(),
      approve: z.enum(["true", "false"]),
      note: z.string().trim().max(1000),
    })
    .safeParse(Object.fromEntries(fd));
  if (!x.success) return { error: "Choose a decision and keep the note under 1,000 characters." };
  if (x.data.approve === "false" && x.data.note.length < 3)
    return { error: "Tell the applicant what they need to correct." };
  const { error } = await db.rpc("review_application_document", {
    p_file: x.data.id,
    p_approve: x.data.approve === "true",
    p_note: x.data.note,
  });
  if (error) return { error: "The document could not be reviewed." };
  wakeNotifications();
  refreshApplication(x.data.user);
  return { message: "Document review saved." };
}

export async function reviewFullApplication(_: ActionState, fd: FormData): Promise<ActionState> {
  const { db } = await requireStaff();
  const parsed = z
    .object({
      declaration: z.uuid(),
      previous: z.enum(fullApplicationStatuses),
      status: z.enum(fullApplicationStatuses),
      note: z.string().trim().min(3).max(2000),
    })
    .safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: "Choose a status and write a short update for the applicant." };
  const { declaration, previous, status, note } = parsed.data;
  const { error } = await db.rpc("review_full_application", {
    p_declaration: declaration,
    p_previous_status: previous,
    p_status: status,
    p_note: note,
  });
  if (error?.message === "Application changed")
    return { error: "This application changed. Refresh before posting an update." };
  if (error?.message === "Required documents need approval")
    return { error: "Review and approve a file for each required document category first." };
  if (error) return { error: "Application update could not be posted." };
  wakeNotifications();
  refreshApplication();
  return { message: "Update posted to the applicant’s dashboard." };
}

export async function respondToApplicationReview(_: ActionState, fd: FormData): Promise<ActionState> {
  const { db, user } = await requireUser();
  const parsed = z
    .object({ declaration: z.uuid(), note: z.string().trim().max(2000) })
    .safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: "Keep your note under 2,000 characters." };
  const { error } = await db.rpc("respond_to_full_application", {
    p_declaration: parsed.data.declaration,
    p_note: parsed.data.note,
  });
  if (error?.message === "Attach a file or write a response")
    return { error: "Upload the requested files or write a response before sending." };
  if (error) return { error: "Your updates could not be sent. Refresh to check the application status." };
  wakeNotifications();
  refreshApplication(user.id);
  return { message: "Updates sent for review." };
}
