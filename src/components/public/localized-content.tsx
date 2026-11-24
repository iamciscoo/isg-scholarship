"use client";
import { useEffect, useRef } from "react";
import { useLocale } from "@/lib/i18n/provider";
import { translateWorkspace } from "@/lib/i18n/workspace-translate";

/**
 * Public pages are server-rendered in English, so translate their text nodes against the
 * source-keyed dictionary after mount. Strings without an entry stay in English.
 */
export function LocalizedContent({ children }: { children: React.ReactNode }) {
  const { locale, m } = useLocale();
  const root = useRef<HTMLDivElement>(null);
  const originals = useRef(new Map<Text, string>());
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, {
      acceptNode: (text) =>
        text.parentElement?.closest("script,style,svg,textarea,code,[data-no-translate]")
          ? NodeFilter.FILTER_REJECT
          : NodeFilter.FILTER_ACCEPT,
    });
    const texts: Text[] = [];
    while (walker.nextNode()) texts.push(walker.currentNode as Text);
    for (const text of texts) {
      const known = originals.current.get(text);
      const source = known ?? text.nodeValue ?? "";
      if (known === undefined) originals.current.set(text, source);
      if (!source.trim()) continue;
      text.nodeValue = locale === "en" ? source : translateWorkspace(m.workspace, source);
    }
  }, [locale, m]);
  return (
    <div ref={root} className="localized-content">
      {children}
    </div>
  );
}