import { getWorkspaceText } from "@/lib/i18n/server";

import { Text } from "@/lib/i18n/workspace-text";
import { requireStaff } from "@/lib/auth/session";
import { Workspace } from "@/components/layout/workspace";
import { EmailSettings } from "@/features/admin/email-settings";
import { assignRole } from "@/features/admin/settings-actions";
import { ActionForm } from "@/components/forms/action-form";
import { savePaymentInstructions } from "@/features/consultations/payment-actions";
export default async function Settings() {
  const { db, user, role } = await requireStaff(true);
  const translate = await getWorkspaceText();
  const [settings, accounts] = await Promise.all([db.rpc("admin_alert_settings"), db.rpc("staff_accounts")]);
  if (settings.error || accounts.error) throw new Error("Settings unavailable");
  const [instructions, packageInstructions] = await Promise.all([
    db.rpc("consultation_payment_instructions"),
    db.rpc("package_payment_instructions"),
  ]);
  if (instructions.error || packageInstructions.error) throw Error("Payment instructions unavailable");
  return (
    <Workspace role={role} email={user.email || ""} active="settings">
      <h1>
        <Text>{"Team and notifications."}</Text>
      </h1>
      <section className="workspace-panel">
        <h2>
          <Text>{"Consultation payment instructions"}</Text>
        </h2>
        <p>
          <Text>
            {
              "The consultation fee is fixed at TZS 50,000. Include the verified bank/network, account name, account number and payment reference applicants should use."
            }
          </Text>
        </p>
        <ActionForm action={savePaymentInstructions} label="Save payment instructions">
          <label>
            <Text>{"Instructions"}</Text>
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
        <h2>
          <Text>{"Scholarship package payment instructions"}</Text>
        </h2>
        <p>
          <Text>
            {
              "These instructions appear after the applicant confirms a package. Its full fee is shown automatically."
            }
          </Text>
        </p>
        <ActionForm action={savePaymentInstructions} label="Save package payment instructions">
          <input type="hidden" name="type" value="package" />
          <label>
            <Text>{"Instructions"}</Text>
            <textarea
              name="instructions"
              defaultValue={packageInstructions.data || ""}
              minLength={10}
              maxLength={5000}
              required
            />
          </label>
        </ActionForm>
      </section>
      <section className="workspace-panel">
        <h2>
          <Text>{"Email recipients"}</Text>
        </h2>
        <EmailSettings emails={settings.data.emails} />
        <p>
          {settings.data.whatsapp_group
            ? translate("Staff WhatsApp group configured.")
            : translate("Staff WhatsApp group not configured.")}
        </p>
        <h3>
          <Text>{"Alert delivery"}</Text>
        </h3>
        {!settings.data.delivery.length ? (
          <p>
            <Text>{"No email or WhatsApp deliveries yet."}</Text>
          </p>
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
        <h2>
          <Text>{"Account roles"}</Text>
        </h2>
        <p>
          <Text>
            {
              "Admins advise applicants and also manage payments, packages and team access. Everyone else is an applicant."
            }
          </Text>
        </p>
        <ul className="account-role-list">
          {accounts.data
            .filter((a: { role: string }) => a.role !== "applicant")
            .map((a: { id: string; email: string; role: string; status: string }) => (
              <li key={a.id}>
                <strong>{a.email}</strong>
                {a.status === "active" ? (
                  <ActionForm action={assignRole} label="Save role" className="account-role-form">
                    <input type="hidden" name="user" value={a.id} />
                    <label>
                      <Text>{"Role"}</Text>
                      <select name="role" defaultValue={a.role} aria-label={`Role for ${a.email}`}>
                        <option value="applicant">
                          <Text>{"Applicant"}</Text>
                        </option>
                        <option value="admin">
                          <Text>{"Admin"}</Text>
                        </option>
                      </select>
                    </label>
                  </ActionForm>
                ) : (
                  <span>
                    <Text>{"Inactive account"}</Text>
                  </span>
                )}
              </li>
            ))}
        </ul>
      </section>
    </Workspace>
  );
}
