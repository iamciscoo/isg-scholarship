"use client";
import { useActionState } from "react";
import { saveEmails } from "./settings-actions";
import { Button } from "@/components/ui/button";
export function EmailSettings({ emails }: { emails: string[] }) {
  const [state, action, pending] = useActionState(saveEmails, {});
  return (
    <form action={action} className="form-stack">
      <label>
        Admin notification emails
        <textarea name="emails" rows={5} defaultValue={emails.join("\n")} maxLength={2600} />
      </label>
      <p>One address per line, up to 10. Changes apply to future account, consultation and lead updates.</p>
      {state.error && <p role="alert">{state.error}</p>}
      {state.message && <p role="status">{state.message}</p>}
      <Button disabled={pending}>Save recipients</Button>
    </form>
  );
}
