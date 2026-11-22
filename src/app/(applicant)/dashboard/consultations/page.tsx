import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { Workspace } from "@/components/layout/workspace";
import { Button } from "@/components/ui/button";
import { PaymentPanel } from "@/features/consultations/payment-panel";
import { CaseSupport } from "@/features/consultations/case-support";
import { SupportingFiles } from "@/features/consultations/supporting-files";

export default async function Consultations() {
  const { db, user, role } = await requireUser();
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
        <h1>Your consultation</h1>
        <Button asChild>
          <Link href="/consultation">{draft.data ? "Continue consultation" : "Start consultation"}</Link>
        </Button>
      </Workspace>
    );
  }
  const [files, instructions, advisor] = await Promise.all([
    db
      .from("case_files")
      .select("id,user_id,kind,mime,category,review_status,review_note,created_at,original_name")
      .eq("user_id", user.id)
      .in("kind", ["receipt", "support"])
      .is("application_id", null)
      .order("created_at", { ascending: false }),
    db.rpc("consultation_payment_instructions"),
    db.rpc("consultation_advisor", { p_user: user.id }),
  ]);
  if (files.error || instructions.error || advisor.error) throw Error("Consultation details unavailable");
  const payment = <PaymentPanel record={record} files={files.data || []} instructions={instructions.data || ""} />;
  const paid = record.payment_status === "verified";
  return (
    <Workspace role={role} email={user.email || ""} active="consultations">
      <div className="workspace-page-heading">
        <div>
          <h1>Your consultation</h1>
          {current && <p>{current.reference} · {current.study_level} · {current.preferred_fields}</p>}
        </div>
      </div>
      {!paid && payment}
      <CaseSupport record={record} advisor={advisor.data} />
      {paid && payment}
      <SupportingFiles files={(files.data || []).filter((file) => file.kind === "support")} />
    </Workspace>
  );
}
