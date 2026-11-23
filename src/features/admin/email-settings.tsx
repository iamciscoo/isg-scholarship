"use client";
import { useWorkspaceText } from "@/lib/i18n/workspace-text";

import { Text } from "@/lib/i18n/workspace-text";

import { useActionState, useRef, useState } from "react";
import { useDirtyForm } from "@/components/forms/unsaved-changes";
import { Mail, Plus, X } from "lucide-react";
import { saveEmails } from "./settings-actions";
import { Button } from "@/components/ui/button";
import { LoadingDots } from "@/components/ui/loading-dots";
export function EmailSettings({ emails }: { emails: string[] }) {
  const translate = useWorkspaceText();
  const [state, action, pending] = useActionState(saveEmails, {});
  const [recipients, setRecipients] = useState(emails);
  const [entry, setEntry] = useState("");
  const [error, setError] = useState("");
  const saved = useRef(emails);
  const { formRef, dirty } = useDirtyForm({
    state,
    pending,
    label: "Save recipients",
    onCancel: () => {
      setRecipients(saved.current);
      setEntry("");
      setError("");
    },
    onSaved: () => {
      saved.current = recipients;
    },
  });
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
    <form ref={formRef} action={action} className="form-stack recipient-editor">
      <input type="hidden" name="emails" value={recipients.join("\n")} />
      <p>
        <Text>
          {"Add the team members who should receive new account, consultation and application updates."}
        </Text>
      </p>
      <ul className="recipient-list" aria-label={translate("Notification recipients")}>
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
      {!recipients.length && (
        <p>
          <Text>{"No email recipients added."}</Text>
        </p>
      )}
      <div className="recipient-add">
        <div className="field">
          <label htmlFor="recipient-email">
            <Text>{"Email address"}</Text>
          </label>
          <input
            id="recipient-email"
            type="email"
            value={entry}
            maxLength={254}
            placeholder={translate("colleague@example.com")}
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
          <Text>{"Add recipient"}</Text>
        </Button>
      </div>
      {(error || state.error) && (
        <p className="notice notice-error" role="alert">
          {translate(error || state.error || "")}
        </p>
      )}
      {state.message && (
        <p className="form-message" role="status">
          {translate(state.message)}
        </p>
      )}
      <Button disabled={pending} className={dirty ? "save-inline-hidden" : undefined}>
        {pending ? (
          <>
            <Text>{"Saving"}</Text>
            <LoadingDots />
          </>
        ) : (
          translate("Save recipients")
        )}
      </Button>
    </form>
  );
}
