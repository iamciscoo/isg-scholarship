"use client";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

export function NavigableRow({ href, children }: { href?: string; children: ReactNode }) {
  const router = useRouter();
  return (
    <tr
      data-href={href}
      onClick={(event) => {
        if (
          !href ||
          event.defaultPrevented ||
          (event.target instanceof Element &&
            event.target.closest('a,button,input,select,textarea,[role="menuitem"],[role="button"]'))
        )
          return;
        const selection = window.getSelection();
        if (selection?.toString() && event.currentTarget.contains(selection.anchorNode)) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey)
          window.open(href, "_blank", "noopener,noreferrer");
        else router.push(href);
      }}
      onAuxClick={(event) => {
        if (
          href &&
          event.button === 1 &&
          !(event.target instanceof Element && event.target.closest("a,button"))
        ) {
          event.preventDefault();
          window.open(href, "_blank", "noopener,noreferrer");
        }
      }}
    >
      {children}
    </tr>
  );
}
