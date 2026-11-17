import { NextResponse } from "next/server";
import { contactRequestSchema } from "@/features/contact/schema";
import { sameOrigin, readJson } from "@/lib/security/request";
import { intakeConfigured } from "@/lib/supabase/config";
import { adminClient } from "@/lib/supabase/admin";
import { guardIntake, payloadHash } from "@/server/services/intake";
export async function POST(request: Request) {
  if (!sameOrigin(request.headers.get("origin")))
    return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 });
  if (!intakeConfigured())
    return NextResponse.json(
      { error: "Please email ISG while the online form is being set up." },
      { status: 503 },
    );
  let input;
  try {
    input = contactRequestSchema.safeParse(await readJson(request));
  } catch {
    return NextResponse.json({ error: "Please check your message." }, { status: 400 });
  }
  if (!input.success || input.data.website)
    return NextResponse.json({ error: "Please check the enquiry details." }, { status: 422 });
  try {
    await guardIntake(request.headers, input.data.turnstileToken, "contact");
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Please try again later." },
      { status: 429 },
    );
  }
  const { data, idempotencyKey } = input.data;
  const result = await adminClient().rpc("submit_enquiry", {
    p_data: data,
    p_key: idempotencyKey,
    p_hash: payloadHash(data),
    p_team_email: process.env.ISG_TEAM_EMAIL || "",
  });
  if (result.error) {
    console.error("enquiry_store_failed", { code: result.error.code });
    return NextResponse.json({ error: "We couldn’t save your enquiry. Please try again." }, { status: 500 });
  }
  return NextResponse.json({ received: true }, { status: 201 });
}
