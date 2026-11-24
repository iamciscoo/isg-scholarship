import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/validation/auth";
import { requestOrigin } from "@/lib/server-origin";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const origin = await requestOrigin();
  const next = safeNext(url.searchParams.get("next"));
  if (code) {
    const db = await createClient();
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }
  return NextResponse.redirect(new URL("/login?error=invalid_link", origin));
}
