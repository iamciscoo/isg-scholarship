"use client";
import { useActionState, useRef, useState } from "react";
import { applicationFields, declarationText, type FullApplication } from "@/lib/validation/application-form";
import { saveFullApplication } from "./application-actions";
import { saveStaffApplication } from "./staff-application-actions";
import { Button } from "@/components/ui/button";
import { LoadingDots } from "@/components/ui/loading-dots";
import { useDirtyForm } from "@/components/forms/unsaved-changes";
import { Text, useWorkspaceText } from "@/lib/i18n/workspace-text";
export function FullApplicationForm({
  initial,
  applicant,
}: {
  initial: Partial<FullApplication>;
  applicant?: string;
}) {
  const [state, action, pending] = useActionState(
    applicant ? saveStaffApplication.bind(null, applicant) : saveFullApplication,
    {},
  );
  const [answers, setAnswers] = useState(initial);
  const [declaration, setDeclaration] = useState(false);
  const saved = useRef(initial);
  const draftButton = useRef<HTMLButtonElement>(null);
  const t = useWorkspaceText();
  const { formRef, dirty } = useDirtyForm({
    state,
    pending,
    label: "Save draft",
    submitter: draftButton,
    onCancel: () => {
      setAnswers(saved.current);
      setDeclaration(false);
    },
    onSaved: () => {
      saved.current = answers;
    },
  });
  return (
    <form action={action} ref={formRef} className="form-stack" aria-busy={pending}>
      {applicationFields.map((section) => (
        <fieldset key={section.title} className="application-section" disabled={pending}>
          <legend>{t(section.title)}</legend>
          <div className="form-grid">
            {section.fields.map((f) => (
              <label className="field" key={f.key}>
                {t(f.label)}
                {f.optional ? ` (${t("optional")})` : ""}
                {f.options ? (
                  <select
                    name={f.key}
                    value={String(answers[f.key] || "")}
                    onChange={(event) =>
                      setAnswers((current) => ({ ...current, [f.key]: event.target.value }))
                    }
                  >
                    <option value="">{t("Not provided")}</option>
                    {f.options.map((x) => (
                      <option key={x} value={x}>
                        {t(x)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    name={f.key}
                    type={f.type || "text"}
                    maxLength={f.type === "email" ? 254 : 160}
                    min={f.type === "number" ? 1950 : undefined}
                    max={f.type === "number" ? 2099 : undefined}
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
        {t(
          applicant
            ? "The applicant confirmed permission to share this contact’s details."
            : "My nominated contact has given me permission to share their details with ISG.",
        )}
      </label>
      <section className="notice">
        <h3>{t(applicant ? "Staff confirmation" : "Declaration")}</h3>
        {!applicant && <p>{t(declarationText)}</p>}
        <label className="checkbox-field">
          <input
            type="checkbox"
            name="declaration"
            checked={declaration}
            onChange={(event) => setDeclaration(event.target.checked)}
            disabled={pending}
          />
          {t(
            applicant
              ? "I have checked these details against the information provided by the applicant."
              : "I sign this declaration electronically.",
          )}
        </label>
      </section>
      {state.error && (
        <p className="notice notice-error" role="alert">
          {t(state.error)}
        </p>
      )}
      {state.message && (
        <p className="form-message" role="status">
          {t(state.message)}
        </p>
      )}
      <div className="workspace-action-row">
        <Button
          ref={draftButton}
          className={dirty ? "save-inline-hidden" : undefined}
          name="intent"
          value="draft"
          variant="outline"
          disabled={pending}
        >
          <Text>Save draft</Text>
        </Button>
        <Button name="intent" value="declare" disabled={pending}>
          {pending ? (
            <>
              <Text>Saving</Text>
              <LoadingDots />
            </>
          ) : applicant ? (
            t("Save application for applicant")
          ) : (
            t("Submit application")
          )}
        </Button>
      </div>
    </form>
  );
}
