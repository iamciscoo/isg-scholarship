"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { useWorkspaceText } from "@/lib/i18n/workspace-text";

const tabs = [
  { id: "details", label: "Details" },
  { id: "documents", label: "Documents" },
] as const;

export function ApplicationTabs({ details, documents }: { details: ReactNode; documents?: ReactNode }) {
  const t = useWorkspaceText();
  const id = useId();
  const [active, setActive] = useState<(typeof tabs)[number]["id"]>("details");
  const hasDocuments = Boolean(documents);

  useEffect(() => {
    const sync = () =>
      setActive(hasDocuments && window.location.hash === "#application-documents" ? "documents" : "details");
    const frame = requestAnimationFrame(sync);
    window.addEventListener("hashchange", sync);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", sync);
    };
  }, [hasDocuments]);

  function select(next: typeof active) {
    setActive(next);
    const url = new URL(window.location.href);
    url.hash = next === "documents" ? "application-documents" : "";
    window.history.replaceState(window.history.state, "", url);
  }

  if (!hasDocuments) return <>{details}</>;

  return (
    <>
      <div
        className="catalogue-tabs application-tabs"
        role="tablist"
        aria-label={t("Scholarship application")}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            id={`${id}-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={active === tab.id}
            aria-controls={`${id}-panel-${tab.id}`}
            tabIndex={active === tab.id ? 0 : -1}
            onClick={() => select(tab.id)}
            onKeyDown={(event) => {
              if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
              event.preventDefault();
              const next =
                event.key === "Home" || (event.key !== "End" && active === "documents")
                  ? "details"
                  : "documents";
              select(next);
              document.getElementById(`${id}-tab-${next}`)?.focus();
            }}
          >
            {t(tab.label)}
          </button>
        ))}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          id={`${id}-panel-${tab.id}`}
          role="tabpanel"
          tabIndex={0}
          aria-labelledby={`${id}-tab-${tab.id}`}
          hidden={active !== tab.id}
        >
          {tab.id === "details" ? details : documents}
        </div>
      ))}
    </>
  );
}
