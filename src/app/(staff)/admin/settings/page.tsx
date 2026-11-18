import { requireStaff } from "@/lib/auth/session";
import { Workspace } from "@/components/layout/workspace";
import { EmailSettings } from "@/features/admin/email-settings";
import { assignRole } from "@/features/admin/settings-actions";
import { Button } from "@/components/ui/button";
import { ActionForm } from "@/components/forms/action-form";
import { savePaymentInstructions } from "@/features/consultations/payment-actions";
export default async function Settings() {
  const { db, user, role } = await requireStaff(true);
  const [settings, accounts] = await Promise.all([db.rpc("admin_alert_settings"), db.rpc("staff_accounts")]);
  if (settings.error || accounts.error) throw new Error("Settings unavailable");
  const instructions = await db.rpc("consultation_payment_instructions");
  if (instructions.error) throw Error("Payment instructions unavailable");
  return (
    <Workspace role={role} email={user.email || ""} active="settings">
      <h1>Team and notifications.</h1>
      <section className="workspace-panel">
        <h2>Consultation payment instructions</h2>
        <p>
          The consultation fee is fixed at TZS 50,000. Include the verified bank/network, account name,
          account number and payment reference applicants should use.
        </p>
        <ActionForm action={savePaymentInstructions} label="Save payment instructions">
          <label>
            Instructions
            <textarea
              name="instructions"
              defaultValue={instructions.data || ""}
              minLength={10}
              maxLength={5000}
              required
            />
          </label>
        </ActionForm>
      </section>
      <section className="workspace-panel">
        <h2>Email recipients</h2>
        <EmailSettings emails={settings.data.emails} />
        <p>
          The Resend test sender delivers only to the Resend account owner. Other email recipients need a
          verified sender domain. WhatsApp group: API Testing🇷🇺.
        </p>
        <h3>Alert delivery</h3>
        {!settings.data.delivery.length ? (
          <p>No event alerts have been queued yet.</p>
        ) : (
          <ul>
            {settings.data.delivery.map((d: { channel: string; state: string; count: number }) => (
              <li key={d.channel + d.state}>
                {d.channel}: {d.state} ({d.count})
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="workspace-panel">
        <h2>Account roles</h2>
        <p>Only active accounts can be assigned a staff role. Every change is audited.</p>
        {accounts.data.map((a: { id: string; email: string; role: string; status: string }) => (
          <form key={a.id} action={assignRole} className="workspace-action-row">
            <input type="hidden" name="user" value={a.id} />
            <span>{a.email}</span>
            <select
              name="role"
              defaultValue={a.role}
              aria-label={`Role for ${a.email}`}
              disabled={a.status !== "active"}
            >
              <option value="applicant">Applicant</option>
              <option value="advisor">Advisor</option>
              <option value="admin">Admin</option>
            </select>
            <Button size="sm" disabled={a.status !== "active"}>
              Save role
            </Button>
          </form>
        ))}
      </section>
    </Workspace>
  );
}
