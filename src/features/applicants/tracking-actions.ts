"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/session";
import type { ActionState } from "@/components/forms/action-form";
import { wakeNotifications } from "@/server/services/notification-delivery";
function refresh(id?: string) {
  wakeNotifications();
  revalidatePath("/dashboard");
  for (const p of ["/dashboard/applications", "/admin/applications", "/advisor/applications"])
    revalidatePath(p);
  if (id)
    for (const p of ["/dashboard/applications/", "/admin/applications/", "/advisor/applications/"])
      revalidatePath(p + id);
}
export async function proposeApplication(_: ActionState, fd: FormData): Promise<ActionState> {
  const { db } = await requireStaff(true);
  const x = z.object({ user: z.uuid(), opportunity: z.uuid() }).safeParse(Object.fromEntries(fd));
  if (!x.success) return { error: "Choose a scholarship package." };
  const { error } = await db.rpc("propose_application", {
    p_user: x.data.user,
    p_opportunity: x.data.opportunity,
  });
  if (error)
    return {
      error:
        "Verify consultation payment and choose an active package. Each applicant can have one assigned package.",
    };
  refresh();
  revalidatePath(`/admin/cases/${x.data.user}`);
  revalidatePath(`/advisor/cases/${x.data.user}`);
  return { message: "Package assigned. The applicant can now pay and upload their receipt." };
}
