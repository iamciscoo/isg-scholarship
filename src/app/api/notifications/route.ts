import { NextResponse } from "next/server";
import { authConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { sameOrigin } from "@/lib/security/request";
import { z } from "zod";
export async function GET() {
  if (!authConfigured()) return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  const db = await createClient();
  const { data, error } = await db.rpc("account_notification_inbox");
  if (error?.code === "42501" || error?.message === "Access denied")
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (error) return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  return NextResponse.json(data, { headers: { "Cache-Control": "private, no-store" } });
}

export async function PATCH(request: Request) {
  if (!sameOrigin(request.headers.get("origin"), request.headers))
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  if (!authConfigured()) return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  const input = z
    .object({ id: z.uuid().nullable() })
    .strict()
    .safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Invalid notification" }, { status: 400 });
  const db = await createClient();
  const { error } = await db.rpc("read_account_notifications", { p_id: input.data.id });
  if (error)
    return NextResponse.json(
      { error: "Unable to update notifications" },
      { status: error.code === "42501" || error.message === "Access denied" ? 401 : 503 },
    );
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
}
