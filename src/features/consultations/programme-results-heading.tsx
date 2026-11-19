"use client";
import { useEffect, useRef } from "react";

export function ProgrammeResultsHeading() {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (window.location.hash !== "#programme-results") return;
    // The public promotions query can stream after the browser's first anchor lookup.
    heading.current?.focus({ preventScroll: true });
    heading.current?.scrollIntoView({ block: "start", behavior: "instant" });
  }, []);
  return (
    <h2 id="programme-results" ref={heading} tabIndex={-1} className="programme-results-heading">
      Programme options
    </h2>
  );
}
