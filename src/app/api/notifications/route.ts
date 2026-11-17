import { NextResponse } from "next/server";
import { authConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
export async function GET() {
  if (!authConfigured()) return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { data, error } = await db.rpc("account_notification_inbox");
  if (error) return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  return NextResponse.json(data, { headers: { "Cache-Control": "private, no-store" } });
}
