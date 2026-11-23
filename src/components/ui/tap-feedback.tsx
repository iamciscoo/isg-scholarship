"use client";
import { useEffect } from "react";

// Delegated feedback covers existing links, native controls and portaled menus.
// It never consumes input or delays the control's actual action.
export function TapFeedback() {
  useEffect(() => {
    const timers = new Map<HTMLElement, ReturnType<typeof setTimeout>>();
    let pressed: HTMLElement | null = null;
    const clear = (target: HTMLElement) => {
      clearTimeout(timers.get(target));
      timers.delete(target);
      target.removeAttribute("data-isg-pressed");
    };
    const down = (event: PointerEvent) => {
      if (!event.isPrimary || event.button !== 0 || !(event.target instanceof Element)) return;
      const target = event.target.closest<HTMLElement>(
        'a[href],button,summary,[role="button"],[role="link"],[role^="menuitem"]',
      );
      if (!target || target.matches(':disabled,[aria-disabled="true"]')) return;
      if (pressed) clear(pressed);
      clear(target);
      pressed = target;
      target.setAttribute("data-isg-pressed", "");
    };
    const up = () => {
      if (!pressed) return;
      const target = pressed;
      pressed = null;
      timers.set(
        target,
        setTimeout(() => clear(target), 160),
      );
    };
    const cancel = () => {
      if (pressed) clear(pressed);
      pressed = null;
    };
    document.addEventListener("pointerdown", down, { passive: true });
    document.addEventListener("pointerup", up, { passive: true });
    document.addEventListener("pointercancel", cancel, { passive: true });
    document.addEventListener("scroll", cancel, { passive: true, capture: true });
    window.addEventListener("blur", cancel);
    return () => {
      document.removeEventListener("pointerdown", down);
      document.removeEventListener("pointerup", up);
      document.removeEventListener("pointercancel", cancel);
      document.removeEventListener("scroll", cancel, true);
      window.removeEventListener("blur", cancel);
      cancel();
      for (const target of timers.keys()) clear(target);
    };
  }, []);
  return null;
}
