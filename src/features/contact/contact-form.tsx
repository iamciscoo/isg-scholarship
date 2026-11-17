"use client";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Turnstile } from "@/components/forms/turnstile";
import { contactSchema } from "./schema";
export function ContactForm({ enabled, topic, nonce }: { enabled: boolean; topic: string; nonce?: string }) {
  const [token, setToken] = useState("");
  const onToken = useCallback((v: string) => setToken(v), []);
  const [key] = useState(() => crypto.randomUUID());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const fd = new FormData(event.currentTarget);
    const parsed = contactSchema.safeParse({
      name: fd.get("name"),
      email: fd.get("email"),
      topic: fd.get("topic"),
      message: fd.get("message"),
      consent: fd.get("consent") === "on",
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setPending(true);
    try {
      const r = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: parsed.data,
          idempotencyKey: key,
          turnstileToken: token,
          website: fd.get("website"),
        }),
      });
      const result = await r.json();
      if (!r.ok) throw new Error(result.error);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Please try again later.");
      setToken("");
      setResetKey((v) => v + 1);
    } finally {
      setPending(false);
    }
  }
  if (sent)
    return (
      <div role="status" className="content-panel">
        <h2>Your message is with us.</h2>
        <p>
          Your enquiry has been saved securely for ISG to review. We’ll use the email you provided to respond.
        </p>
      </div>
    );
  return (
    <form className="form-stack" onSubmit={submit}>
      {!enabled && (
        <div className="notice">
          The online enquiry form is awaiting service setup. Please email ISG directly for now.
        </div>
      )}
      <div className="field">
        <label htmlFor="contact-name">Your name</label>
        <input name="name" id="contact-name" autoComplete="name" required maxLength={160} />
      </div>
      <div className="field">
        <label htmlFor="contact-email">Email address</label>
        <input type="email" name="email" id="contact-email" autoComplete="email" required maxLength={254} />
      </div>
      <div className="field">
        <label htmlFor="contact-topic">What would you like to discuss?</label>
        <select name="topic" id="contact-topic" defaultValue={topic}>
          {["General enquiry", "Consultation", "Service fees", "Privacy request"].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="contact-message">Your message</label>
        <textarea id="contact-message" name="message" required minLength={10} maxLength={2000} />
        <span className="field-help">
          Please don’t send identity documents, academic records or payment details here.
        </span>
      </div>
      <label className="checkbox-field">
        <input type="checkbox" name="consent" required />I agree to ISG using these details to respond to this
        enquiry.
      </label>
      <div className="honeypot" aria-hidden="true">
        <input name="website" tabIndex={-1} aria-label="Website" autoComplete="off" />
      </div>
      <Turnstile action="contact" onToken={onToken} nonce={nonce} resetKey={resetKey} />
      {error && (
        <p className="notice notice-error" role="alert">
          {error}
        </p>
      )}
      <Button disabled={!enabled || pending || !token}>{pending ? "Sending…" : "Send enquiry"}</Button>
    </form>
  );
}
