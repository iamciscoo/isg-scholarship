"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { useWorkspaceText } from "@/lib/i18n/workspace-text";

const tabs = [
  { id: "details", label: "Details" },
  { id: "application", label: "Application" },
  { id: "documents", label: "Documents" },
] as const;

export function ApplicationTabs({
  details,
  application,
  documents,
}: {
  details: ReactNode;
  application?: ReactNode;
  documents?: ReactNode;
}) {
  const t = useWorkspaceText();
  const id = useId();
  const [active, setActive] = useState<(typeof tabs)[number]["id"]>("details");
  const hasDocuments = Boolean(documents);
  const shown = tabs.filter((tab) => tab.id !== "documents" || hasDocuments);

  useEffect(() => {
    const sync = () => {
      const hash = window.location.hash;
      setActive(
        (hash === "#application-documents" && hasDocuments
          ? "documents"
          : hash === "#application-form" && application
            ? "application"
            : "details") as (typeof tabs)[number]["id"],
      );
    };
    const frame = requestAnimationFrame(sync);
    window.addEventListener("hashchange", sync);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", sync);
    };
  }, [hasDocuments, application]);

  function select(next: (typeof active)) {
    setActive(next);
    const url = new URL(window.location.href);
    url.hash = next === "documents" ? "application-documents" : next === "application" ? "application-form" : "";
    window.history.replaceState(window.history.state, "", url);
  }

  if (shown.length < 2) return <>{details}</>;

  return (
    <>
      <div
        className="catalogue-tabs application-tabs"
        role="tablist"
        aria-label={t("Scholarship application")}
      >
        {shown.map((tab) => (
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
              const index = shown.findIndex((item) => item.id === active);
              const next =
                event.key === "Home"
                  ? shown[0]
                  : event.key === "End"
                    ? shown[shown.length - 1]
                    : shown[(index + (event.key === "ArrowLeft" ? shown.length - 1 : 1)) % shown.length];
              select(next.id);
              document.getElementById(`${id}-tab-${next.id}`)?.focus();
            }}
          >
            {t(tab.label)}
          </button>
        ))}
      </div>
      {shown.map((tab) => (
        <div
          key={tab.id}
          id={`${id}-panel-${tab.id}`}
          role="tabpanel"
          tabIndex={0}
          aria-labelledby={`${id}-tab-${tab.id}`}
          hidden={active !== tab.id}
        >
          {tab.id === "details" ? details : tab.id === "documents" ? documents : application}
        </div>
      ))}
    </>
  );
}
