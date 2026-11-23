"use client";
import { useEffect, useActionState } from "react";
import { Button } from "@/components/ui/button";
import { LoadingDots } from "@/components/ui/loading-dots";
import { useDirtyForm } from "./unsaved-changes";
import { Text, useWorkspaceText } from "@/lib/i18n/workspace-text";
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
  const t = useWorkspaceText();
  const { formRef, dirty, revision } = useDirtyForm({
    state,
    pending,
    label,
    enabled: !decisions && !/^(Delete|Remove|Reject|Approve|Verify)/.test(label),
  });
  useEffect(() => {
    if (state.message || state.error) formRef.current?.scrollIntoView({ block: "center" });
  }, [state, formRef]);
  return (
    <form ref={formRef} action={submit} className={className} aria-busy={pending}>
      <fieldset disabled={pending} className="action-fields" key={revision}>
        {children}
      </fieldset>
      {state.error && (
        <p role="alert" className="notice notice-error">
          {t(state.error)}
        </p>
      )}
      {state.message && (
        <p role="status" className="form-message">
          {t(state.message)}
        </p>
      )}
      {decisions ? (
        <div className="workspace-action-row">
          <Button type="submit" disabled={pending} name={decisions.name} value={decisions.primary.value}>
            {pending ? (
              <>
                <Text>Saving</Text>
                <LoadingDots />
              </>
            ) : (
              t(decisions.primary.label)
            )}
          </Button>
          <Button
            type="submit"
            variant="outline"
            disabled={pending}
            name={decisions.name}
            value={decisions.secondary.value}
          >
            {t(decisions.secondary.label)}
          </Button>
        </div>
      ) : (
        <Button disabled={pending} className={dirty ? "save-inline-hidden" : undefined}>
          {pending ? (
            <>
              <Text>Saving</Text>
              <LoadingDots />
            </>
          ) : (
            t(label)
          )}
        </Button>
      )}
    </form>
  );
}
