"use server";
import { revalidatePath } from "next/cache";
import { requireUser, requireStaff } from "@/lib/auth/session";
import {
  applicationFields,
  applicationFieldErrors,
  applicationDraftSchema,
  applicationSubmissionSchema,
} from "@/lib/validation/application-form";
import type { ActionState } from "@/components/forms/action-form";
import { fullApplicationStatuses } from "@/lib/validation/application-review";
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
  const parsed = (declare ? applicationSubmissionSchema : applicationDraftSchema).safeParse({
    ...values,
    email: user.email,
    guardianPermission: fd.get("guardianPermission") === "on",
  });
  if (!parsed.success) return { fieldErrors: applicationFieldErrors(parsed.error.issues) };
  if (declare && fd.get("declaration") !== "on")
    return { fieldErrors: { declaration: "Accept the declaration before submitting." } };
  const { error } = await db.rpc("save_application_form", { p_data: parsed.data, p_declare: declare });
  if (error?.message === "Application review is closed")
    return { error: "This application review is closed. Contact your advisor if you need to make changes." };
  if (error)
    return {
      error: "Your form could not be saved. ISG must verify your package payment first.",
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
export async function reviewFullApplication(_: ActionState, fd: FormData): Promise<ActionState> {
  const { db } = await requireStaff(true);
  const parsed = z
    .object({
      declaration: z.uuid(),
      previous: z.string().trim().min(1).max(40),
      status: z.enum(fullApplicationStatuses),
      note: z.string().trim().max(2000),
    })
    .safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: "Choose an application status." };
  const { declaration, previous, status, note } = parsed.data;
  const { error } = await db.rpc("review_full_application", {
    p_declaration: declaration,
    p_previous_status: previous,
    p_status: status,
    p_note: note,
  });
  if (error?.message === "Application changed")
    return { error: "This application changed. Refresh before posting an update." };
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
