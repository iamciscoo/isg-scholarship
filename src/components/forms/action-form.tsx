"use client";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
export type ActionState = { error?: string; message?: string };
export function ActionForm({
  action,
  children,
  label = "Save",
  className = "form-stack",
}: {
  action: (state: ActionState, data: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  label?: string;
  className?: string;
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
      <Button disabled={pending}>{pending ? "Saving…" : label}</Button>
    </form>
  );
}
