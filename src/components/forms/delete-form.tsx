"use client";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import type { ActionState } from "./action-form";

export function DeleteForm({
  action,
  id,
  label,
  confirm,
}: {
  action: (state: ActionState, fd: FormData) => Promise<ActionState>;
  id: string;
  label: string;
  confirm: string;
}) {
  const [state, submit, pending] = useActionState(action, {});
  return (
    <form
      action={submit}
      onSubmit={(event) => {
        if (!window.confirm(confirm)) event.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="ghost" size="sm" disabled={pending}>
        {pending ? "Deleting…" : label}
      </Button>
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
    </form>
  );
}
