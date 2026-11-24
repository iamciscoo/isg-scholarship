"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { applicationFields, declarationText, type FullApplication } from "@/lib/validation/application-form";
import { saveFullApplication } from "./application-actions";
import { saveStaffApplication } from "./staff-application-actions";
import { Button } from "@/components/ui/button";
import { LoadingDots } from "@/components/ui/loading-dots";
import { useDirtyForm } from "@/components/forms/unsaved-changes";
import type { ActionState } from "@/components/forms/action-form";
import { Text, useWorkspaceText } from "@/lib/i18n/workspace-text";
import { CountrySelect } from "./country-select";
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
  const [edited, setEdited] = useState<Record<string, ActionState>>({});
  const saved = useRef(initial);
  const draftButton = useRef<HTMLButtonElement>(null);
  const t = useWorkspaceText();
  const { formRef, dirty, revision } = useDirtyForm({
    state,
    pending,
    label: "Save draft",
    submitter: draftButton,
    onCancel: () => {
      setAnswers(saved.current);
      setDeclaration(false);
      setEdited(Object.fromEntries(Object.keys(state.fieldErrors || {}).map((name) => [name, state])));
    },
    onSaved: () => {
      saved.current = answers;
    },
  });
  useEffect(() => {
    if (!pending && state.fieldErrors) {
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    }
  }, [formRef, pending, state]);
  const errorFor = (name: string) =>
    pending || edited[name] === state ? undefined : state.fieldErrors?.[name];
  const clearError = (name: string) => setEdited((current) => ({ ...current, [name]: state }));
  const fieldAttrs = (name: string) => ({
    "aria-invalid": !!errorFor(name),
    "aria-describedby": errorFor(name) ? `application-${name}-error` : undefined,
  });
  const inline = (name: string) => {
    const error = errorFor(name);
    return (
      error && (
        <span id={`application-${name}-error`} role="alert" className="field-error">
          {t(error)}
        </span>
      )
    );
  };
  const update = (name: keyof FullApplication, value: string | boolean) => {
    setAnswers((current) => ({ ...current, [name]: value }));
    clearError(name);
  };
  return (
    <form action={action} ref={formRef} className="form-stack" aria-busy={pending}>
      {applicationFields.map((section) => (
        <fieldset key={section.title} className="application-section" disabled={pending}>
          <legend>{t(section.title)}</legend>
          <div className="form-grid">
            {section.fields.map((f) => (
              <div className="field" key={f.key}>
                <label htmlFor={`application-${f.key}`}>
                  {t(f.label)}
                  {f.optional ? ` (${t("optional")})` : ""}
                </label>
                {f.type === "country" ? (
                  <>
                    <input type="hidden" name={f.key} value={String(answers[f.key] || "")} />
                    <CountrySelect
                      key={`${f.key}-${revision}`}
                      id={`application-${f.key}`}
                      name={f.key}
                      defaultValue={String(answers[f.key] || "")}
                      required
                      invalid={!!errorFor(f.key)}
                      describedBy={fieldAttrs(f.key)["aria-describedby"]}
                      onValueChange={(value) => {
                        update(f.key, value);
                        formRef.current?.dispatchEvent(new Event("change", { bubbles: true }));
                      }}
                    />
                  </>
                ) : f.options ? (
                  <select
                    id={`application-${f.key}`}
                    {...fieldAttrs(f.key)}
                    name={f.key}
                    value={String(answers[f.key] || "")}
                    onChange={(event) => update(f.key, event.target.value)}
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
                    id={`application-${f.key}`}
                    {...fieldAttrs(f.key)}
                    name={f.key}
                    type={f.type || "text"}
                    maxLength={f.type === "email" ? 254 : 160}
                    min={f.type === "number" ? 1950 : undefined}
                    max={f.type === "number" ? 2099 : f.type === "date" ? new Date().toISOString().slice(0, 10) : undefined}
                    aria-required={!f.optional}
                    value={String(answers[f.key] || "")}
                    onChange={(event) => update(f.key, event.target.value)}
                    readOnly={f.key === "email"}
                  />
                )}
                {inline(f.key)}
              </div>
            ))}
          </div>
        </fieldset>
      ))}
      <div>
        <label className="checkbox-field">
          <input
            {...fieldAttrs("guardianPermission")}
            type="checkbox"
            name="guardianPermission"
            checked={answers.guardianPermission || false}
            onChange={(event) => update("guardianPermission", event.target.checked)}
            disabled={pending}
          />
          {t(
            applicant
              ? "The applicant confirmed permission to share this contact’s details."
              : "My nominated contact has given me permission to share their details with ISG.",
          )}
        </label>
        {inline("guardianPermission")}
      </div>
      <section className="notice">
        <h3>{t(applicant ? "Staff confirmation" : "Declaration")}</h3>
        {!applicant && <p>{t(declarationText)}</p>}
        <label className="checkbox-field">
          <input
            {...fieldAttrs("declaration")}
            type="checkbox"
            name="declaration"
            checked={declaration}
            onChange={(event) => {
              setDeclaration(event.target.checked);
              clearError("declaration");
            }}
            disabled={pending}
          />
          {t(
            applicant
              ? "I have checked these details against the information provided by the applicant."
              : "I sign this declaration electronically.",
          )}
        </label>
        {inline("declaration")}
      </section>
      {state.error && (
        <p className="field-error" role="alert">
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
          formNoValidate
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
