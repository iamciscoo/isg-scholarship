"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { ActionState } from "@/components/forms/action-form";
import { requireStaff } from "@/lib/auth/session";

export async function deleteContactEnquiry(_: ActionState, fd: FormData): Promise<ActionState> {
  const { db } = await requireStaff(true);
  const id = z.uuid().safeParse(fd.get("id"));
  if (!id.success) return { error: "Choose an enquiry to delete." };
  const { error } = await db.rpc("delete_contact_enquiry", { p_id: id.data });
  if (error) return { error: "The enquiry could not be deleted. Refresh the inbox and try again." };
  revalidatePath("/admin/enquiries");
  return { message: "Enquiry deleted." };
}
