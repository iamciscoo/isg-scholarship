import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/validation/auth";
import { requestOrigin } from "@/lib/server-origin";
import { importGoogleProfile } from "@/server/services/google-profile";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const origin = await requestOrigin();
  const next = safeNext(url.searchParams.get("next"));
  const failure = url.searchParams.get("error_code") || url.searchParams.get("error");
  if (failure === "email_exists" || failure === "identity_already_exists")
    return NextResponse.redirect(new URL("/login?error=email_exists", origin));
  if (code) {
    const db = await createClient();
    const { data, error } = await db.auth.exchangeCodeForSession(code);
    if (!error) {
      const user = data?.user;
      if (user) await importGoogleProfile(user.id, user.user_metadata);
      return NextResponse.redirect(new URL(next, origin));
    }
  }
  return NextResponse.redirect(new URL("/login?error=invalid_link", origin));
}
