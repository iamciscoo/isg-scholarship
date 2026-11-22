"use client";
import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Check } from "lucide-react";
import { assessmentFields, assessmentSchema, type AssessmentInput } from "@/lib/validation/assessment";
import { Button } from "@/components/ui/button";
import { LoadingDots } from "@/components/ui/loading-dots";
import { Turnstile } from "@/components/forms/turnstile";
import { steps, consentFields } from "./fields";
import { AssessmentReview } from "./assessment-review";
import { saveConsultationDraft } from "@/features/consultations/actions";
import { requestId } from "@/lib/request-id";
const titles = ["About", "Academics", "Ambitions", "Review"];
export function AssessmentForm({
  enabled,
  challengeRequired,
  nonce,
  initial = {},
  initialStep = 0,
}: {
  enabled: boolean;
  challengeRequired: boolean;
  nonce?: string;
  initial?: Partial<AssessmentInput>;
  initialStep?: number;
}) {
  const [step, setStep] = useState(initialStep);
  const [key] = useState(requestId);
  const [token, setToken] = useState("");
  const onToken = useCallback((v: string) => setToken(v), []);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const navigating = useRef(false);
  function openConsultation() {
    navigating.current = true;
    window.location.replace("/dashboard/consultations#consultation-payment");
  }
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
      performance: "",
      englishStatus: "",
      preferredFields: "",
      destinations: "",
      processingConsent: false,
      marketingConsent: false,
      adultConfirmation: false,
      ...initial,
      constraints: "",
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
    if (!(await form.trigger([...assessmentFields[step]], { shouldFocus: true }))) return;
    setPending(true);
    try {
      const names = assessmentFields.slice(0, step + 1).flat();
      const values = form.getValues();
      const result = await saveConsultationDraft(
        Object.fromEntries(names.map((name) => [name, values[name]])),
        step + 1,
      );
      if (result.existing) {
        openConsultation();
        return;
      }
      if (result.error) {
        setError(result.error);
        return;
      }
      move(step + 1);
    } catch {
      setError("Your progress could not be saved. Please try again.");
    } finally {
      if (!navigating.current) setPending(false);
    }
  }
  async function submit(data: AssessmentInput) {
    if (!enabled || (challengeRequired && !token)) {
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
      if (response.ok || response.status === 409) {
        openConsultation();
        return;
      }
      const result = await response.json();
      throw new Error(result.error || "We couldn’t submit your consultation. Please try again.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Please try again.");
      setToken("");
      setResetKey((v) => v + 1);
    } finally {
      if (!navigating.current) setPending(false);
    }
  }
  const values = form.getValues();
  return (
    <div className="container assessment-shell">
      <aside className="assessment-sidebar">
        <h1>Start your consultation</h1>
        <ol className="assessment-stepper" aria-label="Assessment progress">
          {titles.map((title, i) => (
            <li key={title} aria-current={i === step ? "step" : undefined}>
              <span className="step-number">{i < step ? <Check size={14} /> : i + 1}</span>
              <span className="step-label">{title}</span>
            </li>
          ))}
        </ol>
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
        {step < 3 ? (
          <div className="form-grid">
            {steps[step].map((field) => (
              <div
                className={step === 0 && !["firstName", "lastName"].includes(field.name) ? "field assessment-contact-field" : "field"}
                key={field.name}
              >
                <label htmlFor={field.name}>{field.label}</label>
                {field.options ? (
                  <select
                    id={field.name}
                    // Controlled so the value shown is always the value validated (iOS keeps an untouched default otherwise).
                    value={String(form.watch(field.name) ?? "")}
                    onChange={(event) =>
                      form.setValue(field.name, event.target.value as never, {
                        shouldValidate: true,
                        shouldDirty: true,
                      })
                    }
                    onBlur={() => void form.trigger(field.name)}
                    aria-invalid={!!form.formState.errors[field.name]}
                    aria-describedby={`${field.name}-error`}
                  >
                    <option value="">Select an option</option>
                    {field.options.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id={field.name}
                    readOnly={field.name === "email"}
                    {...form.register(field.name)}
                    type={["email", "tel", "number"].includes(field.type || "") ? field.type : "text"}
                    autoComplete={field.type && !["number"].includes(field.type) ? field.type : "off"}
                    aria-invalid={!!form.formState.errors[field.name]}
                    aria-describedby={`${field.name}-error`}
                    maxLength={
                      field.name === "preferredFields" || field.name === "destinations"
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
            {consentFields.map((item) => (
              <div key={item.name}>
                <label className="checkbox-field">
                  <input type="checkbox" {...form.register(item.name)} />
                  {item.text}
                </label>
                <span className="field-error">{form.formState.errors[item.name]?.message}</span>
              </div>
            ))}
            {challengeRequired && (
              <Turnstile action="assessment" nonce={nonce} onToken={onToken} resetKey={resetKey} />
            )}
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
          <Button
            type="submit"
            disabled={pending || (step === 3 && (!enabled || (challengeRequired && !token)))}
          >
            {pending ? (
              <>
                {step === 3 ? "Submitting" : "Saving"}
                <LoadingDots />
              </>
            ) : step === 3 ? (
              "Submit consultation"
            ) : (
              "Continue"
            )}
            <ArrowRight size={17} />
          </Button>
        </div>
        {step === 3 && !enabled && (
          <p className="field-help mt-4">
            Online submission is currently unavailable.{" "}
            <Link href="/contact" className="underline">
              Contact ISG
            </Link>{" "}
            for help.
          </p>
        )}
      </form>
    </div>
  );
}
