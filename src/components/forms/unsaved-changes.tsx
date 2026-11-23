"use client";
import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Text, useWorkspaceText } from "@/lib/i18n/workspace-text";
import type { ActionState } from "./action-form";

type DirtyForm = { id: string; label: string; pending: boolean; cancel: () => void; save: () => void };
const Context = createContext<{
  register: (entry: DirtyForm) => void;
  remove: (id: string) => void;
} | null>(null);

export function UnsavedChangesProvider({ children }: { children: React.ReactNode }) {
  const [forms, setForms] = useState<DirtyForm[]>([]);
  const register = useCallback((entry: DirtyForm) => {
    setForms((current) => [...current.filter((item) => item.id !== entry.id), entry]);
  }, []);
  const remove = useCallback((id: string) => {
    setForms((current) =>
      current.some((item) => item.id === id) ? current.filter((item) => item.id !== id) : current,
    );
  }, []);
  const context = useMemo(() => ({ register, remove }), [register, remove]);
  const active = forms.at(-1);
  const t = useWorkspaceText();
  useEffect(() => {
    if (!forms.length) return;
    const preventLoss = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", preventLoss);
    return () => window.removeEventListener("beforeunload", preventLoss);
  }, [forms.length]);
  return (
    <Context.Provider value={context}>
      {children}
      {active && (
        <aside className="unsaved-changes-bar" aria-label={t("Unsaved changes")}>
          <Button type="button" variant="outline" onClick={active.cancel} disabled={active.pending}>
            <Text>Cancel</Text>
          </Button>
          <p role="status">
            <Text>Unsaved changes</Text>
            {forms.length > 1 ? ` (${forms.length})` : ""}
          </p>
          <Button type="button" onClick={active.save} disabled={active.pending}>
            {t(active.pending ? "Saving" : active.label)}
          </Button>
        </aside>
      )}
    </Context.Provider>
  );
}

function snapshot(form: HTMLFormElement) {
  return JSON.stringify(
    [...new FormData(form)].map(([name, value]) => [
      name,
      typeof value === "string" ? value : [value.name, value.size, value.size ? value.lastModified : 0],
    ]),
  );
}

export function useDirtyForm({
  state,
  pending,
  label,
  enabled = true,
  onCancel,
  onSaved,
  submitter,
}: {
  state: ActionState;
  pending: boolean;
  label: string;
  enabled?: boolean;
  onCancel?: () => void;
  onSaved?: () => void;
  submitter?: React.RefObject<HTMLButtonElement | null>;
}) {
  const context = useContext(Context);
  const formRef = useRef<HTMLFormElement>(null);
  const baseline = useRef<string | null>(null);
  const submitted = useRef<FormData | null>(null);
  const callbacks = useRef({ onCancel, onSaved, submitter });
  useEffect(() => {
    callbacks.current = { onCancel, onSaved, submitter };
  });
  const id = useId();
  const [dirty, setDirty] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const form = formRef.current;
    if (!form || !enabled) return;
    baseline.current ??= snapshot(form);
    let timer: ReturnType<typeof setTimeout>;
    const changed = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setDirty(snapshot(form) !== baseline.current), 0);
    };
    form.addEventListener("input", changed);
    form.addEventListener("change", changed);
    form.addEventListener("click", changed);
    const submitting = () => {
      submitted.current = new FormData(form);
    };
    form.addEventListener("submit", submitting);
    return () => {
      clearTimeout(timer);
      form.removeEventListener("input", changed);
      form.removeEventListener("change", changed);
      form.removeEventListener("click", changed);
      form.removeEventListener("submit", submitting);
    };
  }, [enabled]);
  useEffect(() => {
    if (!state.error || pending || !submitted.current) return;
    const frame = requestAnimationFrame(() => {
      const form = formRef.current;
      if (!form) return;
      // React resets native fields after a resolved action, including validation failures.
      // Keep the submitted values available so the applicant can correct and retry.
      for (const field of Array.from(form.elements)) {
        if (
          !(
            field instanceof HTMLInputElement ||
            field instanceof HTMLSelectElement ||
            field instanceof HTMLTextAreaElement
          ) ||
          !field.name ||
          (field instanceof HTMLInputElement && ["file", "hidden"].includes(field.type))
        )
          continue;
        const values = submitted.current!.getAll(field.name);
        if (field instanceof HTMLInputElement && ["checkbox", "radio"].includes(field.type))
          field.checked = values.includes(field.value);
        else if (field instanceof HTMLSelectElement && field.multiple)
          for (const option of field.options) option.selected = values.includes(option.value);
        else field.value = String(values[0] ?? "");
      }
      setDirty(snapshot(form) !== baseline.current);
    });
    return () => cancelAnimationFrame(frame);
  }, [state, pending]);
  useEffect(() => {
    if (!state.message || pending) return;
    const frame = requestAnimationFrame(() => {
      if (formRef.current) baseline.current = snapshot(formRef.current);
      callbacks.current.onSaved?.();
      setDirty(false);
      window.dispatchEvent(new Event("isg:notifications-read"));
    });
    return () => cancelAnimationFrame(frame);
  }, [state, pending]);
  const cancel = useCallback(() => {
    formRef.current?.reset();
    callbacks.current.onCancel?.();
    setRevision((current) => current + 1);
    setDirty(false);
    requestAnimationFrame(() => {
      if (formRef.current) baseline.current = snapshot(formRef.current);
    });
  }, []);
  const save = useCallback(() => {
    formRef.current?.requestSubmit(callbacks.current.submitter?.current || undefined);
  }, []);
  useEffect(() => {
    if (!context || !dirty || !enabled) return;
    context.register({ id, label, pending, cancel, save });
    return () => context.remove(id);
  }, [context, dirty, enabled, id, label, pending, cancel, save]);
  return { formRef, dirty, revision };
}
