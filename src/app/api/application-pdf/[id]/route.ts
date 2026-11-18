import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { applicationPdf } from "@/server/services/application-pdf";
import { fullApplicationSchema } from "@/lib/validation/application-form";
import { authConfigured } from "@/lib/supabase/config";
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!authConfigured()) return new Response(null, { status: 503 });
  if (!z.uuid().safeParse(id).success) return new Response(null, { status: 404 });
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return new Response(null, { status: 401 });
  const { data: record, error } = await db
    .from("application_declarations")
    .select("id,user_id,version,data,accepted_at,snapshot_hash")
    .eq("id", id)
    .maybeSingle();
  if (error || !record) return new Response(null, { status: 404 });
  const parsed = fullApplicationSchema.safeParse(record.data);
  if (!parsed.success)
    return Response.json(
      { error: "This submitted form needs review before PDF generation." },
      { status: 422 },
    );
  try {
    const pdf = await applicationPdf({ ...record, data: parsed.data });
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="ISG-application-${record.id}.pdf"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return Response.json({ error: "PDF generation is temporarily unavailable." }, { status: 503 });
  }
}
