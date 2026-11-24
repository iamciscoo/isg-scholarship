"use client";
import { Text, useWorkspaceText } from "@/lib/i18n/workspace-text";

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
  const translate = useWorkspaceText();
  const [state, action, pending] = useActionState(publishNotification, {});
  const [audience, setAudience] = useState("single");
  return (
    <form action={action} className="form-stack">
      <input type="hidden" name="request" value={requestId} />
      <label>
        <Text>{"Audience"}</Text>
        <select
          value={audience}
          onChange={(e) => setAudience(e.target.value)}
          disabled={Boolean(state.message)}
        >
          <option value="single">
            <Text>{"One account"}</Text>
          </option>
          <option value="all">
            <Text>{"All active accounts"}</Text>
          </option>
        </select>
      </label>
      {audience === "all" ? (
        <>
          <input type="hidden" name="recipient" value="" />
          <p className="notice">
            <Text>
              {
                "This message will appear in every active account, including accounts created later."
              }
            </Text>
          </p>
        </>
      ) : (
        <label>
          <Text>{"Recipient"}</Text>
          <select name="recipient" required defaultValue="" disabled={Boolean(state.message)}>
            <option value="">
              <Text>{"Select an account"}</Text>
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
        <Text>{"Title"}</Text>
        <input name="title" required minLength={3} maxLength={120} disabled={Boolean(state.message)} />
      </label>
      <label>
        <Text>{"Message"}</Text>
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
        <Text>{"Optional destination"}</Text>
        <select name="link" disabled={Boolean(state.message)}>
          <option value="">
            <Text>{"No link"}</Text>
          </option>
          <option value="/dashboard">
            <Text>{"Account overview"}</Text>
          </option>
          <option value="/dashboard/profile">
            <Text>{"Profile"}</Text>
          </option>
          <option value="/contact">
            <Text>{"Contact ISG"}</Text>
          </option>
          <option value="/eligibility">
            <Text>{"Eligibility assessment"}</Text>
          </option>
          <option value="/pathways">
            <Text>{"Study pathways"}</Text>
          </option>
          <option value="/faqs">
            <Text>{"Frequently asked questions"}</Text>
          </option>
        </select>
      </label>
      <label className="checkbox-field">
        <input
          type="checkbox"
          name="email"
          defaultChecked
          aria-describedby="notification-email-hint"
          disabled={Boolean(state.message)}
        />
        <Text>{"Also notify by email"}</Text>
      </label>
      <small id="notification-email-hint">
        <Text>{"Email alerts go to current recipients with confirmed addresses. Recipients sign in to read the message."}</Text>
      </small>
      <label className="checkbox-field">
        <input type="checkbox" required disabled={Boolean(state.message)} />
        <Text>{"I have reviewed this message and its audience. Publish it to these accounts."}</Text>
      </label>
      {state.error && (
        <p role="alert" className="notice notice-error">
          {translate(state.error)}
        </p>
      )}
      {state.message && (
        <p role="status" className="form-message">
          {translate(state.message)}
        </p>
      )}
      <Button disabled={pending || Boolean(state.message)}>
        {pending ? (
          <>
            <Text>{"Publishing"}</Text>
            <LoadingDots />
          </>
        ) : (
          translate("Publish notification")
        )}
      </Button>
    </form>
  );
}
