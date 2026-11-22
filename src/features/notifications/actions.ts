"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth/session";
export type NotificationState = { error?: string; message?: string };
export async function publishNotification(
  _previous: NotificationState,
  fd: FormData,
): Promise<NotificationState> {
  const { db } = await requireStaff(true);
  const parsed = z
    .object({
      title: z.string().trim().min(3).max(120),
      body: z.string().trim().min(5).max(2000),
      link: z.enum([
        "",
        "/dashboard",
        "/dashboard/profile",
        "/eligibility",
        "/contact",
        "/pathways",
        "/how-it-works",
        "/services",
        "/pricing",
        "/faqs",
      ]),
      recipient: z.union([z.literal(""), z.uuid()]),
      request: z.uuid(),
    })
    .safeParse(Object.fromEntries(fd));
  if (!parsed.success)
    return { error: "Check the title, message and recipient. Links must point to an ISG page." };
  const p = parsed.data;
  const { error } = await db.rpc("publish_account_notification", {
    p_title: p.title,
    p_body: p.body,
    p_link: p.link,
    p_recipient: p.recipient || null,
    p_request: p.request,
  });
  if (error) return { error: "The notification could not be published. Check the recipient and try again." };
  revalidatePath("/admin/notifications");
  return { message: "Notification published. It is now available in the recipients’ ISG accounts." };
}
