"use client";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
export type ActionState = { error?: string; message?: string };
export function ActionForm({
  action,
  children,
  label = "Save",
  className = "form-stack",
  decisions,
}: {
  action: (state: ActionState, data: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  label?: string;
  className?: string;
  decisions?: {
    name: string;
    primary: { label: string; value: string };
    secondary: { label: string; value: string };
  };
}) {
  const [state, submit, pending] = useActionState(action, {});
  return (
    <form
      action={submit}
      className={className}
      aria-busy={pending}
      onReset={(event) => event.preventDefault()}
    >
      <fieldset disabled={pending} className="action-fields">
        {children}
      </fieldset>
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
      {decisions ? (
        <div className="workspace-action-row">
          <Button type="submit" disabled={pending} name={decisions.name} value={decisions.primary.value}>
            {pending ? "Saving…" : decisions.primary.label}
          </Button>
          <Button
            type="submit"
            variant="outline"
            disabled={pending}
            name={decisions.name}
            value={decisions.secondary.value}
          >
            {decisions.secondary.label}
          </Button>
        </div>
      ) : (
        <Button disabled={pending}>{pending ? "Saving…" : label}</Button>
      )}
    </form>
  );
}
