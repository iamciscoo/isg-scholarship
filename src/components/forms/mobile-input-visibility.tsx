"use client";

import { useEffect } from "react";

export function MobileInputVisibility() {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    let frame = 0;
    const keepVisible = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const field = document.activeElement;
        if (
          window.innerWidth > 900 ||
          viewport.scale > 1.05 ||
          !(field instanceof HTMLElement) ||
          !field.matches(
            'textarea, input:not([type="checkbox"], [type="radio"], [type="file"], [type="hidden"])',
          )
        )
          return;
        const rect = field.getBoundingClientRect();
        const header = document.querySelector(".site-header")?.getBoundingClientRect().bottom || 0;
        const top = Math.max(viewport.offsetTop, header) + 12;
        const bottom = viewport.offsetTop + viewport.height - 12;
        if (rect.bottom > bottom || rect.top < top)
          field.scrollIntoView({ block: "center", behavior: "instant" });
      });
    };
    viewport.addEventListener("resize", keepVisible);
    document.addEventListener("focusin", keepVisible);
    return () => {
      viewport.removeEventListener("resize", keepVisible);
      document.removeEventListener("focusin", keepVisible);
      cancelAnimationFrame(frame);
    };
  }, []);
  return null;
}
