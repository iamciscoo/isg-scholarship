"use client";

import { Children, useId, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useWorkspaceText } from "@/lib/i18n/workspace-text";

export function DestinationCarousel({ label, children }: { label: string; children: ReactNode }) {
  const links = Children.toArray(children);
  const pages = Array.from({ length: Math.ceil(links.length / 4) }, (_, index) => links.slice(index * 4, index * 4 + 4));
  const rail = useRef<HTMLDivElement>(null);
  const id = useId();
  const [page, setPage] = useState(0);
  const t = useWorkspaceText();

  function trackPage() {
    const element = rail.current;
    if (element) setPage(Math.round(Math.abs(element.scrollLeft) / element.clientWidth) || 0);
  }
  function goTo(index: number) {
    if (!rail.current) return;
    const direction = getComputedStyle(rail.current).direction === "rtl" ? -1 : 1;
    rail.current.scrollTo({
      left: direction * index * rail.current.clientWidth,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
  }
  return (
    <section className="hero-destinations" aria-label={label}>
      <header className="destination-carousel-head">
        <span>{label}</span>
        {pages.length > 1 && (
          <div className="destination-carousel-controls">
            <button type="button" aria-label={t("Previous destinations")} aria-controls={id}
              disabled={page === 0} onClick={() => goTo(page - 1)}><ChevronLeft size={16} aria-hidden /></button>
            <button type="button" aria-label={t("Next destinations")} aria-controls={id}
              disabled={page >= pages.length - 1} onClick={() => goTo(page + 1)}><ChevronRight size={16} aria-hidden /></button>
          </div>
        )}
      </header>
      <div id={id} className="destination-carousel-rail" ref={rail} onScroll={trackPage}>
        {pages.map((items, index) => <div className="destination-carousel-page" key={index}>{items}</div>)}
      </div>
    </section>
  );
}
