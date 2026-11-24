"use client";
import { useEffect, useRef, useState, useActionState } from "react";
import { Button } from "@/components/ui/button";
import { LoadingDots } from "@/components/ui/loading-dots";
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
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);
  return (
    <form
      ref={form}
      action={submit}
      onSubmit={(event) => {
        if (open) return;
        event.preventDefault();
        setOpen(true);
      }}
    >
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="danger" size="sm" disabled={pending}>
        {pending ? (
          <>
            Deleting
            <LoadingDots />
          </>
        ) : (
          label
        )}
      </Button>
      <dialog ref={dialog} className="confirm-dialog" onClose={() => setOpen(false)}>
        <h2>Delete this item?</h2>
        <p>{confirm}</p>
        <div className="confirm-actions">
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={() => {
              setOpen(false);
              form.current?.requestSubmit();
            }}
          >
            Delete
          </Button>
        </div>
      </dialog>
      {state.error && (
        <p role="alert" className="field-error">
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
