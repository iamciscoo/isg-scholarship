import { NextResponse } from "next/server";
import { contactRequestSchema } from "@/features/contact/schema";
import { sameOrigin, readJson } from "@/lib/security/request";
import { contactConfigured, contactChallengeRequired } from "@/lib/supabase/config";
import { adminClient } from "@/lib/supabase/admin";
import { guardIntake, payloadHash } from "@/server/services/intake";
import { wakeNotifications } from "@/server/services/notification-delivery";
export async function POST(request: Request) {
  if (!sameOrigin(request.headers.get("origin"), request.headers))
    return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 });
  if (!contactConfigured())
    return NextResponse.json(
      { error: "The enquiry service is temporarily unavailable. Please email ISG." },
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
    await guardIntake(request.headers, input.data.turnstileToken, "contact", contactChallengeRequired());
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
    p_team_email: "", // Admin recipients are managed centrally by the durable event queue.
  });
  if (result.error) {
    console.error("enquiry_store_failed", { code: result.error.code });
    return NextResponse.json({ error: "We couldn’t save your enquiry. Please try again." }, { status: 500 });
  }
  wakeNotifications();
  return NextResponse.json({ received: true }, { status: 201 });
}
