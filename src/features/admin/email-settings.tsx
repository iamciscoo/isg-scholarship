"use client";
import { useActionState, useState } from "react";
import { Mail, Plus, X } from "lucide-react";
import { saveEmails } from "./settings-actions";
import { Button } from "@/components/ui/button";
export function EmailSettings({ emails }: { emails: string[] }) {
  const [state, action, pending] = useActionState(saveEmails, {});
  const [recipients, setRecipients] = useState(emails);
  const [entry, setEntry] = useState("");
  const [error, setError] = useState("");
  function add() {
    const value = entry.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setError("Enter a valid email address.");
      return;
    }
    if (recipients.length >= 10) {
      setError("You can add up to 10 recipients.");
      return;
    }
    setRecipients([...new Set([...recipients, value])]);
    setEntry("");
    setError("");
  }
  return (
    <form action={action} className="form-stack recipient-editor">
      <input type="hidden" name="emails" value={recipients.join("\n")} />
      <p>Add the team members who should receive new account, consultation and application updates.</p>
      <ul className="recipient-list" aria-label="Notification recipients">
        {recipients.map((email) => (
          <li key={email}>
            <Mail size={16} />
            <span>{email}</span>
            <button
              type="button"
              aria-label={`Remove ${email}`}
              disabled={pending}
              onClick={() => setRecipients(recipients.filter((value) => value !== email))}
            >
              <X size={16} />
            </button>
          </li>
        ))}
      </ul>
      {!recipients.length && <p>No email recipients added.</p>}
      <div className="recipient-add">
        <div className="field">
          <label htmlFor="recipient-email">Email address</label>
          <input
            id="recipient-email"
            type="email"
            value={entry}
            maxLength={254}
            placeholder="colleague@example.com"
            onChange={(e) => setEntry(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
          />
        </div>
        <Button type="button" variant="outline" onClick={add} disabled={pending || !entry}>
          <Plus size={17} />
          Add recipient
        </Button>
      </div>
      {(error || state.error) && (
        <p className="notice notice-error" role="alert">
          {error || state.error}
        </p>
      )}
      {state.message && (
        <p className="form-message" role="status">
          {state.message}
        </p>
      )}
      <Button disabled={pending}>{pending ? "Saving…" : "Save recipients"}</Button>
    </form>
  );
}
