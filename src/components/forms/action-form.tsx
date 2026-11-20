"use client";
import { useEffect, useRef, useActionState } from "react";
import { Button } from "@/components/ui/button";
import { LoadingDots } from "@/components/ui/loading-dots";
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
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.message || state.error) formRef.current?.scrollIntoView({ block: "center" });
  }, [state]);
  return (
    <form
      ref={formRef}
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
            {pending ? (
              <>
                Saving
                <LoadingDots />
              </>
            ) : (
              decisions.primary.label
            )}
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
        <Button disabled={pending}>
          {pending ? (
            <>
              Saving
              <LoadingDots />
            </>
          ) : (
            label
          )}
        </Button>
      )}
    </form>
  );
}
