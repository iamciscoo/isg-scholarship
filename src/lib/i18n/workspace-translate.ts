export type WorkspaceMessages = Record<string, string>;

/** Translate interface copy only; applicant answers and staff-authored notes stay as entered. */
export function translateWorkspace(
  messages: WorkspaceMessages,
  source: string,
  values: Record<string, string | number> = {},
) {
  const key = source.replace(/\s+/g, " ").trim();
  const translated = messages[key];
  const copy =
    translated === undefined
      ? source
      : `${source.match(/^\s*/)?.[0] || ""}${translated}${source.match(/\s*$/)?.[0] || ""}`;
  return copy.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.hasOwn(values, key) ? String(values[key]) : match,
  );
}
