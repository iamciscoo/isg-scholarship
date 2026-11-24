"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Plus, X } from "lucide-react";
import { useWorkspaceText } from "@/lib/i18n/workspace-text";

export function CatalogueLayout({
  editor,
  children,
  label,
  editing,
}: {
  editor: ReactNode;
  children: ReactNode;
  label: string;
  editing: boolean;
}) {
  const [open, setOpen] = useState(editing);
  const editorId = useId();
  const controls = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLElement>(null);
  const t = useWorkspaceText();
  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 767px)").matches;
    if (!open || (!editing && !mobile)) return;
    const target = mobile ? controls.current : panel.current;
    target?.scrollIntoView({ block: editing ? "start" : "nearest" });
    panel.current?.focus({ preventScroll: true });
  }, [editing, open]);

  return (
    <div className="operation-grid catalogue-grid">
      <div className="catalogue-mobile-action" ref={controls}>
        <button
          type="button"
          className="button button-outline button-sm"
          aria-expanded={open}
          aria-controls={editorId}
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={16} aria-hidden /> : <Plus size={16} aria-hidden />}
          {t(open ? "Hide form" : label)}
        </button>
      </div>
      <section
        id={editorId}
        ref={panel}
        tabIndex={-1}
        aria-label={t(label)}
        className="workspace-panel catalogue-editor"
        data-open={open}
      >
        {editor}
      </section>
      {children}
    </div>
  );
}
