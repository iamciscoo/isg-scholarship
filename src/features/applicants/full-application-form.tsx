"use client";
import { useActionState, useState } from "react";
import {
  applicationFields,
  declarationText,
  declarationVersion,
  type FullApplication,
} from "@/lib/validation/application-form";
import { saveFullApplication } from "./application-actions";
import { Button } from "@/components/ui/button";
import { LoadingDots } from "@/components/ui/loading-dots";
export function FullApplicationForm({ initial }: { initial: Partial<FullApplication> }) {
  const [state, action, pending] = useActionState(saveFullApplication, {});
  const [answers, setAnswers] = useState(initial);
  const [declaration, setDeclaration] = useState(false);
  return (
    <form
      action={action}
      onReset={(event) => event.preventDefault()}
      className="form-stack"
      aria-busy={pending}
    >
      {applicationFields.map((section) => (
        <fieldset key={section.title} className="application-section" disabled={pending}>
          <legend>{section.title}</legend>
          <div className="form-grid">
            {section.fields.map((f) => (
              <label className="field" key={f.key}>
                {f.label}
                {f.optional ? " (optional)" : ""}
                {f.options ? (
                  <select
                    name={f.key}
                    value={String(answers[f.key] || "")}
                    onChange={(event) =>
                      setAnswers((current) => ({ ...current, [f.key]: event.target.value }))
                    }
                  >
                    <option value="">Not provided</option>
                    {f.options.map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    name={f.key}
                    type={f.type || "text"}
                    maxLength={f.type === "email" ? 254 : 160}
                    value={String(answers[f.key] || "")}
                    onChange={(event) =>
                      setAnswers((current) => ({ ...current, [f.key]: event.target.value }))
                    }
                    readOnly={f.key === "email"}
                  />
                )}
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      <label className="checkbox-field">
        <input
          type="checkbox"
          name="guardianPermission"
          checked={answers.guardianPermission || false}
          onChange={(event) =>
            setAnswers((current) => ({ ...current, guardianPermission: event.target.checked }))
          }
          disabled={pending}
        />
        I have informed this person and have permission to share their contact details with ISG for my
        application.
      </label>
      <section className="notice">
        <h2>Applicant declaration</h2>
        <p>{declarationText}</p>
        <label className="checkbox-field">
          <input
            type="checkbox"
            name="declaration"
            checked={declaration}
            onChange={(event) => setDeclaration(event.target.checked)}
            disabled={pending}
          />
          I accept this declaration and submit my application details.
        </label>
        <small>
          Version {declarationVersion}. Your acceptance time and a snapshot of these answers are recorded when
          you submit.
        </small>
      </section>
      {state.error && (
        <p className="notice notice-error" role="alert">
          {state.error}
        </p>
      )}
      {state.message && (
        <p className="form-message" role="status">
          {state.message}
        </p>
      )}
      <div className="workspace-action-row">
        <Button name="intent" value="draft" variant="outline" disabled={pending}>
          Save draft
        </Button>
        <Button name="intent" value="declare" disabled={pending}>
          {pending ? (
            <>
              Saving
              <LoadingDots />
            </>
          ) : (
            "Submit with declaration"
          )}
        </Button>
      </div>
    </form>
  );
}
