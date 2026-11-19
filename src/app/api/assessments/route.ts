import { NextResponse } from "next/server";
import { intakeSchema } from "@/lib/validation/assessment";
import { sameOrigin, readJson } from "@/lib/security/request";
import { intakeConfigured } from "@/lib/supabase/config";
import { adminClient } from "@/lib/supabase/admin";
import { guardIntake, payloadHash } from "@/server/services/intake";
import { createClient } from "@/lib/supabase/server";
export async function POST(request: Request) {
  if (!sameOrigin(request.headers.get("origin"), request.headers))
    return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 });
  if (!intakeConfigured())
    return NextResponse.json(
      { error: "Assessment submission is not available yet. Please contact ISG." },
      { status: 503 },
    );
  let input;
  try {
    input = intakeSchema.safeParse(await readJson(request));
  } catch {
    return NextResponse.json({ error: "Please check your submission." }, { status: 400 });
  }
  if (!input.success || input.data.website)
    return NextResponse.json({ error: "Please check the information in your assessment." }, { status: 422 });
  const { data, idempotencyKey, turnstileToken } = input.data;
  const session = await createClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user)
    return NextResponse.json(
      { error: "Register and sign in to your account before starting a consultation." },
      { status: 401 },
    );
  if (data.email.toLowerCase() !== user.email?.toLowerCase())
    return NextResponse.json({ error: "Use your account email." }, { status: 422 });
  try {
    await guardIntake(request.headers, turnstileToken, "assessment");
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Please try again later." },
      { status: 429 },
    );
  }
  const result = await adminClient().rpc("submit_my_consultation", {
    p_data: data,
    p_key: idempotencyKey,
    p_hash: payloadHash(data),
    p_team_email: process.env.ISG_TEAM_EMAIL || "",
    p_user: user.id,
  });
  if (result.error) {
    console.error("assessment_store_failed", { code: result.error.code });
    return NextResponse.json(
      { error: "We couldn’t save your assessment. Keep this page open and try again." },
      { status: 500 },
    );
  }
  return NextResponse.json({ reference: result.data }, { status: 201 });
}
