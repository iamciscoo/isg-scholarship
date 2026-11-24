"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth/session";
import type { ActionState } from "@/components/forms/action-form";
import {
  applicationFields,
  applicationFieldErrors,
  applicationDraftSchema,
  applicationSubmissionSchema,
} from "@/lib/validation/application-form";
import { wakeNotifications } from "@/server/services/notification-delivery";

export async function saveStaffApplication(
  applicant: string,
  _: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const { db } = await requireStaff();
  if (!z.uuid().safeParse(applicant).success) return { error: "Applicant unavailable." };
  const submit = fd.get("intent") === "declare";
  const values = Object.fromEntries(
    applicationFields.flatMap((section) =>
      section.fields.map((field) => [field.key, String(fd.get(field.key) || "")]),
    ),
  );
  const parsed = (submit ? applicationSubmissionSchema : applicationDraftSchema).safeParse({
    ...values,
    guardianPermission: fd.get("guardianPermission") === "on",
  });
  if (!parsed.success) return { fieldErrors: applicationFieldErrors(parsed.error.issues) };
  if (submit && fd.get("declaration") !== "on")
    return { fieldErrors: { declaration: "Confirm the source of the details before saving the application." } };
  const { error } = await db.rpc("save_staff_application", {
    p_user: applicant,
    p_data: parsed.data,
    p_submit: submit,
  });
  if (error?.message === "Application review is closed")
    return { error: "This application is closed. Reopen its status before making changes." };
  if (error) return { error: "Unable to save. Check your access and that the package payment is verified." };
  for (const area of ["admin", "advisor"]) {
    revalidatePath(`/${area}/cases/${applicant}`);
    revalidatePath(`/${area}/cases/${applicant}/application`);
    revalidatePath(`/${area}/applications`);
    revalidatePath(`/${area}/declarations/[id]`, "page");
  }
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/application");
  if (submit) wakeNotifications();
  return { message: submit ? "Application recorded. You can add files below." : "Applicant draft saved." };
}
