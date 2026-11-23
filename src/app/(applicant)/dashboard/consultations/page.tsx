import { getWorkspaceText } from "@/lib/i18n/server";

import { Text } from "@/lib/i18n/workspace-text";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { Workspace } from "@/components/layout/workspace";
import { Button } from "@/components/ui/button";
import { PaymentPanel } from "@/features/consultations/payment-panel";

export default async function Consultations() {
  const { db, user, role } = await requireUser();
  const translate = await getWorkspaceText();
  if (role !== "applicant") redirect(role === "admin" ? "/admin/consultations" : "/advisor");
  const [consultation, draft, requests] = await Promise.all([
    db.from("consultation_cases").select("*").eq("user_id", user.id).maybeSingle(),
    db.from("consultation_drafts").select("step").eq("user_id", user.id).maybeSingle(),
    db.rpc("my_consultations"),
  ]);
  if (consultation.error || draft.error || requests.error) throw new Error("Consultations unavailable");
  const record = consultation.data;
  const current = requests.data?.[0];
  if (!record) {
    return (
      <Workspace role={role} email={user.email || ""} active="consultations">
        <h1>
          <Text>{"Your consultation"}</Text>
        </h1>
        <Button asChild>
          <Link href="/consultation">
            {draft.data ? translate("Continue consultation") : translate("Start consultation")}
          </Link>
        </Button>
      </Workspace>
    );
  }
  const [files, instructions] = await Promise.all([
    db
      .from("case_files")
      .select("id,user_id,kind,mime,category,review_status,review_note,created_at,original_name")
      .eq("user_id", user.id)
      .eq("kind", "receipt")
      .is("application_id", null)
      .order("created_at", { ascending: false }),
    db.rpc("consultation_payment_instructions"),
  ]);
  if (files.error || instructions.error) throw Error("Consultation details unavailable");
  const payment = (
    <PaymentPanel record={record} files={files.data || []} instructions={instructions.data || ""} />
  );
  const paid = record.payment_status === "verified";
  return (
    <Workspace role={role} email={user.email || ""} active="consultations">
      <div className="workspace-page-heading">
        <div>
          <h1>
            <Text>{"Your consultation"}</Text>
          </h1>
          {current && (
            <p>
              {current.reference} · {current.study_level} · {current.preferred_fields}
            </p>
          )}
        </div>
      </div>
      {!paid && payment}
      {paid && (
        <p>
          <Text>{"ISG will contact you on WhatsApp to discuss your study plans."}</Text>
        </p>
      )}
      {paid && payment}
    </Workspace>
  );
}
