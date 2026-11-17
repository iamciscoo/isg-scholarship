import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { MfaForm } from "@/features/auth/mfa-form";
export default async function Mfa() {
  const { db, role } = await requireUser();
  if (role === "applicant") redirect("/dashboard");
  const { data } = await db.auth.mfa.listFactors();
  return (
    <>
      <h1>One more layer of protection.</h1>
      <p>Staff access requires your authenticator code.</p>
      <MfaForm factorId={data?.totp.find((factor) => factor.status === "verified")?.id} />
    </>
  );
}
