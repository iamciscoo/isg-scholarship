"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { adminClient } from "@/lib/supabase/admin";
export type MfaState = { error?: string; factorId?: string; qrCode?: string };
export async function enrollMfa(): Promise<MfaState> {
  const { db, role } = await requireUser();
  if (role === "applicant") return { error: "Staff access is required." };
  const { data: factors } = await db.auth.mfa.listFactors();
  for (const factor of factors?.all || []) {
    if (factor.factor_type === "totp" && factor.status === "unverified")
      await db.auth.mfa.unenroll({ factorId: factor.id });
  }
  const { data, error } = await db.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "ISG staff authenticator",
  });
  if (error) return { error: "We couldn’t start authenticator setup. Please try again." };
  return { factorId: data.id, qrCode: data.totp.qr_code };
}
export async function verifyMfa(_state: MfaState, fd: FormData): Promise<MfaState> {
  const { db, user, role } = await requireUser();
  if (role === "applicant") return { error: "Staff access is required." };
  const input = z
    .object({ factorId: z.uuid(), code: z.string().regex(/^\d{6}$/) })
    .safeParse({ factorId: fd.get("factorId"), code: fd.get("code") });
  if (!input.success) return { error: "Enter the six-digit code from your authenticator." };
  const rate = await adminClient().rpc("consume_rate_limit", {
    p_key: `mfa:${user.id}`,
    p_limit: 10,
    p_seconds: 900,
  });
  if (rate.error || !rate.data) return { error: "Please wait 15 minutes before trying again." };
  const { error } = await db.auth.mfa.challengeAndVerify(input.data);
  if (error) return { error: "The code could not be verified. Try a fresh code." };
  redirect(role === "admin" ? "/admin" : "/advisor");
}
