"use client";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Check, CheckCircle2, ShieldCheck } from "lucide-react";
import { assessmentFields, assessmentSchema, type AssessmentInput } from "@/lib/validation/assessment";
import { Button } from "@/components/ui/button";
import { Turnstile } from "@/components/forms/turnstile";
import { steps } from "./fields";
import { AssessmentReview } from "./assessment-review";
const titles = ["About you", "Your academics", "Your ambitions", "Review & consent"];
export function AssessmentForm({ enabled, nonce }: { enabled: boolean; nonce?: string }) {
  const [step, setStep] = useState(0);
  const [key] = useState(() => crypto.randomUUID());
  const [token, setToken] = useState("");
  const onToken = useCallback((v: string) => setToken(v), []);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [reference, setReference] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const form = useForm<AssessmentInput>({
    resolver: zodResolver(assessmentSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      nationality: "",
      residence: "",
      fieldOfStudy: "",
      graduationYear: "",
      preferredFields: "",
      destinations: "",
      constraints: "",
      processingConsent: false,
      marketingConsent: false,
      adultConfirmation: false,
    },
    mode: "onBlur",
  });
  const [website, setWebsite] = useState("");
  function move(next: number) {
    setStep(next);
    setError("");
    requestAnimationFrame(() => heading.current?.focus());
  }
  async function advance() {
    if (await form.trigger([...assessmentFields[step]], { shouldFocus: true })) move(step + 1);
  }
  async function submit(data: AssessmentInput) {
    if (!enabled || !token) {
      setError("Complete the security check before submitting.");
      return;
    }
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data, idempotencyKey: key, turnstileToken: token, website }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "We couldn’t submit your assessment. Please try again.");
      setReference(result.reference);
      form.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Please try again.");
      setToken("");
      setResetKey((v) => v + 1);
    } finally {
      setPending(false);
    }
  }
  if (reference)
    return (
      <section className="success-panel" role="status">
        <CheckCircle2 size={44} />
        <h1>A good first step.</h1>
        <p>
          Your assessment has been received securely. Keep your reference for future conversations with ISG.
        </p>
        <div className="reference">{reference}</div>
        <p>
          An advisor will review your information. This is an initial review, not confirmation of scholarship
          eligibility. Your confirmation email is queued for delivery.
        </p>
        <Button asChild>
          <Link href="/register">
            Create an account <ArrowRight size={17} />
          </Link>
        </Button>
      </section>
    );
  const values = form.getValues();
  return (
    <div className="container assessment-shell">
      <aside className="assessment-sidebar">
        <span className="eyebrow">Your journey starts here</span>
        <h1>Let’s get to know your ambition.</h1>
        <p>A few details help us understand where you are and where you want to go. No documents needed.</p>
        <ol className="assessment-stepper" aria-label="Assessment progress">
          {titles.map((title, i) => (
            <li key={title} aria-current={i === step ? "step" : undefined}>
              <span>{i < step ? <Check size={14} /> : i + 1}</span>
              {title}
            </li>
          ))}
        </ol>
        <div className="notice">
          <ShieldCheck size={22} className="mb-3" />
          Your assessment is private. It is reviewed by authorized ISG staff.
        </div>
      </aside>
      <form
        className="assessment-form"
        noValidate
        onSubmit={(e) => {
          if (step < 3) {
            e.preventDefault();
            void advance();
          } else void form.handleSubmit(submit)(e);
        }}
      >
        <h2 ref={heading} tabIndex={-1}>
          {titles[step]}
        </h2>
        <p className="form-intro">
          {step === 3
            ? "Check your details and tell us how we may use your information."
            : "Fields are required unless marked optional."}
        </p>
        {!enabled && (
          <div className="notice mb-6" role="status">
            Assessment submission opens after ISG completes its service setup. You can explore the form or{" "}
            <Link href="/contact" className="underline">
              contact ISG
            </Link>
            .
          </div>
        )}
        {step < 3 ? (
          <div className="form-grid">
            {steps[step].map((field) => (
              <div className="field" key={field.name}>
                <label htmlFor={field.name}>{field.label}</label>
                {field.options ? (
                  <select
                    id={field.name}
                    {...form.register(field.name)}
                    aria-invalid={!!form.formState.errors[field.name]}
                    aria-describedby={`${field.name}-error`}
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Select an option
                    </option>
                    {field.options.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    id={field.name}
                    {...form.register(field.name)}
                    type={["email", "tel", "number"].includes(field.type || "") ? field.type : "text"}
                    autoComplete={field.type && !["number"].includes(field.type) ? field.type : "off"}
                    aria-invalid={!!form.formState.errors[field.name]}
                    aria-describedby={`${field.name}-error`}
                    maxLength={
                      field.name === "constraints"
                        ? 400
                        : field.name === "preferredFields"
                          ? 200
                          : field.name === "email"
                            ? 254
                            : 150
                    }
                  />
                )}
                {field.help && <span className="field-help">{field.help}</span>}
                <span id={`${field.name}-error`} className="field-error">
                  {form.formState.errors[field.name]?.message}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="form-stack">
            <AssessmentReview values={values} />
            <p className="field-help">
              We use your information to review your assessment and contact you about next steps. Please read
              our{" "}
              <Link href="/privacy" className="underline">
                privacy information
              </Link>
              .
            </p>
            {(
              [
                { name: "adultConfirmation", text: "I confirm that I am 18 years of age or older." },
                {
                  name: "processingConsent",
                  text: "I consent to ISG processing my information to review this assessment and contact me about it.",
                },
                {
                  name: "marketingConsent",
                  text: "Optional: I would like occasional study guidance and service updates by email.",
                },
              ] as const
            ).map((item) => (
              <div key={item.name}>
                <label className="checkbox-field">
                  <input type="checkbox" {...form.register(item.name)} />
                  {item.text}
                </label>
                <span className="field-error">{form.formState.errors[item.name]?.message}</span>
              </div>
            ))}
            <Turnstile action="assessment" nonce={nonce} onToken={onToken} resetKey={resetKey} />
          </div>
        )}
        <div className="honeypot" aria-hidden="true">
          <label htmlFor="website">Website</label>
          <input
            id="website"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </div>
        {error && (
          <p role="alert" className="notice notice-error mt-6">
            {error}
          </p>
        )}
        <div className="form-actions">
          <Button
            type="button"
            variant="ghost"
            onClick={() => move(step - 1)}
            disabled={step === 0 || pending}
          >
            Back
          </Button>
          <Button type="submit" disabled={pending || (step === 3 && (!enabled || !token))}>
            {pending ? "Submitting…" : step === 3 ? "Submit assessment" : "Continue"}
            <ArrowRight size={17} />
          </Button>
        </div>
        <p className="field-help mt-4">
          An initial assessment does not guarantee funding, admission or a visa.
        </p>
      </form>
    </div>
  );
}
