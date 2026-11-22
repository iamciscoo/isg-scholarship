"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser, requireStaff } from "@/lib/auth/session";
import type { ActionState } from "@/components/forms/action-form";
import { meetingRequestNote, meetingSlots, meetingTopics, meetingZones } from "./meeting-options";
import { wakeNotifications } from "@/server/services/notification-delivery";
function refresh(id: string) {
  wakeNotifications();
  revalidatePath("/dashboard");
  revalidatePath("/admin");
  revalidatePath("/admin/consultations");
  revalidatePath("/dashboard/consultations");
  revalidatePath(`/admin/cases/${id}`);
  revalidatePath(`/advisor/cases/${id}`);
  revalidatePath("/dashboard/application");
}
export async function requestWhatsAppCall(_: ActionState, fd: FormData): Promise<ActionState> {
  const { db } = await requireUser();
  const input = z
    .object({ user: z.uuid(), note: z.string().trim().max(200) })
    .safeParse({ user: fd.get("user"), note: fd.get("note") || "" });
  if (!input.success) return { error: "Check the consultation and note." };
  const { data, error } = await db.rpc("request_whatsapp_call", {
    p_user: input.data.user,
    p_note: input.data.note,
  });
  if (error) return { error: "The call could not be requested. Check that the consultation is approved." };
  refresh(input.data.user);
  return { message: data ? "WhatsApp call requested." : "A WhatsApp call is already requested." };
}

export async function cancelWhatsAppCall(_: ActionState, fd: FormData): Promise<ActionState> {
  const { db } = await requireUser();
  const input = z.object({ request: z.uuid(), user: z.uuid() }).safeParse(Object.fromEntries(fd));
  if (!input.success) return { error: "Choose a call request." };
  const { error } = await db.rpc("close_whatsapp_call", { p_request: input.data.request });
  if (error) return { error: "This call request could not be cancelled." };
  refresh(input.data.user);
  return { message: "Call request cancelled." };
}

export async function completeConsultationCall(_: ActionState, fd: FormData): Promise<ActionState> {
  const { db } = await requireStaff();
  const user = z.uuid().safeParse(fd.get("user"));
  if (!user.success || fd.get("met") !== "on")
    return { error: "Confirm you have completed the consultation." };
  const { error } = await db.rpc("complete_consultation_call", { p_user: user.data });
  if (error) return { error: "The application could not be unlocked. Check the consultation approval." };
  refresh(user.data);
  return { message: "Consultation completed and scholarship application unlocked." };
}
export async function requestMeeting(_: ActionState, fd: FormData): Promise<ActionState> {
  const { db, user } = await requireUser();
  const parsed = z
    .object({
      date: z.iso.date(),
      time: z.enum(meetingSlots),
      zone: z.enum(meetingZones),
      topic: z.enum(meetingTopics),
      details: z.string().trim().max(200).optional(),
    })
    .safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: "Choose a date, time and topic for the meeting." };
  const { date, time, zone, topic, details } = parsed.data;
  if (date < new Date().toISOString().slice(0, 10)) return { error: "Choose today or a later date." };
  const note = meetingRequestNote(date, time, zone, topic, details);
  const { error } = await db.rpc("request_consultation_meeting", { p_note: note });
  if (error)
    return { error: "A meeting could not be requested. Check payment verification or try again shortly." };
  refresh(user.id);
  return { message: "Your request is with ISG. The team will confirm a suitable time." };
}
export async function scheduleMeeting(_: ActionState, fd: FormData): Promise<ActionState> {
  const { db } = await requireStaff();
  const parsed = z
    .object({
      user: z.uuid(),
      start: z.iso.datetime(),
      end: z.iso.datetime(),
      zone: z.string().min(1).max(80),
      url: z
        .url()
        .refine((link) => link.startsWith("https://"), "Use an https link"),
      request: z.union([z.uuid(), z.literal("")]),
    })
    .safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: "Choose a date and paste a valid https meeting link." };
  const x = parsed.data;
  const { error } = await db.rpc("schedule_consultation_meeting", {
    p_user: x.user,
    p_start: x.start,
    p_end: x.end,
    p_zone: x.zone,
    p_url: x.url,
    p_request: x.request || null,
  });
  if (error)
    return {
      error:
        "The meeting could not be scheduled. Verify payment, future dates and that neither participant has an overlapping ISG meeting.",
    };
  refresh(x.user);
  return { message: "Meeting scheduled. It is visible in the workspace and its email is queued." };
}
export async function finishMeeting(_: ActionState, fd: FormData): Promise<ActionState> {
  const { db } = await requireStaff();
  const parsed = z
    .object({
      meeting: z.uuid(),
      user: z.uuid(),
      status: z.enum(["completed", "cancelled"]),
      note: z.string().trim().max(1000).optional(),
    })
    .safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: "Choose an outcome." };
  const x = parsed.data;
  const { error } = await db.rpc("finish_consultation_meeting", {
    p_meeting: x.meeting,
    p_status: x.status,
    p_note: x.note ?? "",
  });
  if (error) return { error: "The meeting could not be updated. Try again shortly." };
  refresh(x.user);
  return { message: "Meeting history updated." };
}
