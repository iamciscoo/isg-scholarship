"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { authConfigured } from "@/lib/supabase/config";
import { authSchema, passwordSchema, safeNext } from "@/lib/validation/auth";
import { clientIdentity, sameOrigin } from "@/lib/security/request";
import { requireUser } from "@/lib/auth/session";
export type AuthState = { error?: string; message?: string };
export async function authenticate(_previous: AuthState, fd: FormData): Promise<AuthState> {
  if (!authConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY)
    return { error: "Account services are awaiting setup. Please contact ISG." };
  const requestHeaders = await headers();
  if (!sameOrigin(requestHeaders.get("origin"))) return { error: "Request origin is not allowed." };
  const mode = z.enum(["login", "register", "forgot-password"]).safeParse(fd.get("mode"));
  const captchaRequired = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
  const email = z.email().trim().toLowerCase().max(254).safeParse(fd.get("email"));
  const captchaToken = z
    .string()
    .max(2048)
    .safeParse(fd.get("captcha") || "");
  if (!mode.success || !email.success || !captchaToken.success || (captchaRequired && !captchaToken.data))
    return { error: "Check your email and complete the security check." };
  const rate = await adminClient().rpc("consume_rate_limit", {
    p_key: `auth:${clientIdentity(requestHeaders)}`,
    p_limit: 10,
    p_seconds: 900,
  });
  if (rate.error || !rate.data) return { error: "Please wait 15 minutes before trying again." };
  const db = await createClient();
  const url = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  if (mode.data === "forgot-password") {
    const { error } = await db.auth.resetPasswordForEmail(email.data, {
      redirectTo: `${url}/auth/callback?next=/reset-password`,
      captchaToken: captchaToken.data,
    });
    if (error) console.error("auth_recovery_request_failed", { code: error.code });
    return {
      message: "If an account exists for this email, a recovery link will be sent. Please check your inbox.",
    };
  }
  const credentials = authSchema.safeParse({ email: email.data, password: fd.get("password") });
  if (!credentials.success) return { error: "Enter a valid email and password." };
  if (mode.data === "register") {
    const password = passwordSchema.safeParse(credentials.data.password);
    if (!password.success) return { error: password.error.issues[0].message };
    if (fd.get("terms") !== "on" || fd.get("adult") !== "on")
      return { error: "Confirm you are 18 or older and accept the terms and privacy information." };
    if (fd.get("confirmPassword") !== credentials.data.password)
      return { error: "The two passwords must match." };
    const { data: registered, error } = await db.auth.signUp({
      ...credentials.data,
      options: {
        emailRedirectTo: `${url}/auth/callback?next=/consultation`,
        ...(captchaRequired ? { captchaToken: captchaToken.data } : {}),
      },
    });
    if (error)
      return {
        error:
          "We couldn’t start registration. Please try again or use password recovery if you already have an account.",
      };
    if (registered.session) redirect(safeNext(String(fd.get("next") || "/dashboard")));
    return { message: "Your account was created. Sign in to continue." };
  }
  const { data, error } = await db.auth.signInWithPassword({
    ...credentials.data,
    options: captchaRequired ? { captchaToken: captchaToken.data } : undefined,
  });
  if (error) return { error: "We couldn’t sign you in. Check your email and password." };
  const requested = String(fd.get("next") || "");
  if (!requested && data.user) {
    const { data: role } = await db.from("user_roles").select("role").eq("user_id", data.user.id).single();
    if (role?.role === "admin") redirect("/admin");
    if (role?.role === "advisor") redirect("/advisor");
  }
  redirect(safeNext(requested));
}
export async function signOut() {
  const db = await createClient();
  await db.auth.signOut({ scope: "local" });
  redirect("/login");
}
export async function resetPassword(_state: AuthState, fd: FormData): Promise<AuthState> {
  const { db } = await requireUser();
  if (!sameOrigin((await headers()).get("origin"))) return { error: "Request origin is not allowed." };
  const password = passwordSchema.safeParse(fd.get("password"));
  if (!password.success) return { error: password.error.issues[0].message };
  const { error } = await db.auth.updateUser({ password: password.data });
  if (error)
    return { error: "This recovery session could not update your password. Request a new recovery link." };
  await db.auth.signOut({ scope: "local" });
  return { message: "Your password has been updated. Sign in with your new password." };
}
