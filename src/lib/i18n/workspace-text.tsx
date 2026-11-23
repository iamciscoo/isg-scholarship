"use client";
import { useLocale } from "./provider";
import { translateWorkspace } from "./workspace-translate";

export function useWorkspaceText() {
  const { m } = useLocale();
  return (source: string, values?: Record<string, string | number>) =>
    translateWorkspace(m.workspace, source, values);
}

export function Text({
  children,
  values,
}: {
  children: string | number | null | undefined;
  values?: Record<string, string | number>;
}) {
  const t = useWorkspaceText();
  return typeof children === "string" ? t(children, values) : children;
}

export function DateText({ value, time = false }: { value: string; time?: boolean }) {
  const { locale } = useLocale();
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    ...(time ? { timeStyle: "short" as const } : {}),
    timeZone: "Africa/Dar_es_Salaam",
  }).format(new Date(value));
}
