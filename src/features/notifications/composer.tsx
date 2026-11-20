"use client";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { LoadingDots } from "@/components/ui/loading-dots";
import { publishNotification } from "./actions";
export function NotificationComposer({
  recipients,
  requestId,
}: {
  recipients: { id: string; name: string }[];
  requestId: string;
}) {
  const [state, action, pending] = useActionState(publishNotification, {});
  const [audience, setAudience] = useState("single");
  return (
    <form action={action} className="form-stack">
      <input type="hidden" name="request" value={requestId} />
      <label>
        Audience
        <select
          value={audience}
          onChange={(e) => setAudience(e.target.value)}
          disabled={Boolean(state.message)}
        >
          <option value="single">One account</option>
          <option value="all">All active accounts</option>
        </select>
      </label>
      {audience === "all" ? (
        <>
          <input type="hidden" name="recipient" value="" />
          <p className="notice">
            This message will appear in every active account, including accounts created later. It does not
            send email or WhatsApp messages.
          </p>
        </>
      ) : (
        <label>
          Recipient
          <select name="recipient" required defaultValue="" disabled={Boolean(state.message)}>
            <option value="" disabled>
              Select an account
            </option>
            {recipients.map((p) => (
              <option value={p.id} key={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <label>
        Title
        <input name="title" required minLength={3} maxLength={120} disabled={Boolean(state.message)} />
      </label>
      <label>
        Message
        <textarea
          name="body"
          required
          minLength={5}
          maxLength={2000}
          rows={5}
          disabled={Boolean(state.message)}
        />
      </label>
      <label>
        Optional destination
        <select name="link" disabled={Boolean(state.message)}>
          <option value="">No link</option>
          <option value="/dashboard">Account overview</option>
          <option value="/dashboard/profile">Profile</option>
          <option value="/contact">Contact ISG</option>
          <option value="/eligibility">Eligibility assessment</option>
          <option value="/pathways">Study pathways</option>
          <option value="/faqs">Frequently asked questions</option>
        </select>
      </label>
      <label className="checkbox-field">
        <input type="checkbox" required disabled={Boolean(state.message)} />I have reviewed this message and
        its audience. Publish it to these accounts.
      </label>
      {state.error && (
        <p role="alert" className="notice notice-error">
          {state.error}
        </p>
      )}
      {state.message && (
        <p role="status" className="form-message">
          {state.message}
        </p>
      )}
      <Button disabled={pending || Boolean(state.message)}>
        {pending ? (
          <>
            Publishing
            <LoadingDots />
          </>
        ) : (
          "Publish notification"
        )}
      </Button>
    </form>
  );
}
