"use client";
import { useEffect } from "react";
import {useLocale} from "@/lib/i18n/provider";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
export function HomeMotion() {
  const {locale}=useLocale();
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const root = document.querySelector("[data-home]");
    if (!root) return;
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const context = gsap.context(() => {
        const reveals = gsap.utils.toArray<HTMLElement>(".intro-heading,.service-item,.leaders-grid article,.education-story,.pathway-tile,.care-copy,.faq-section > div");
        reveals.forEach((element,i) => {
          gsap.from(element, { y: 28,  duration: 0.7, delay: (i % 3) * 0.045, ease: "power3.out", scrollTrigger: { trigger: element, start: "top 92%", toggleActions: "play reverse play reverse" } });
        });
        gsap.to(".hero-photo", { y: 30, scale: 1.06, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
        gsap.to(".hero-cream-plane", { y: -24, rotation: 1.5, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
        gsap.to(".hero-route-plaque", { y: -45, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
        gsap.fromTo(".destination-photo img", { scale: 1.08, y: -18 }, { scale: 1.02, y: 18, ease: "none", scrollTrigger: { trigger: ".destination-feature", start: "top bottom", end: "bottom top", scrub: true } });
        const rtl = document.documentElement.dir === "rtl";
        gsap.fromTo(".flight-plane", { insetInlineStart: "0%" }, { insetInlineStart: "calc(100% - 24px)", ease: "none", scrollTrigger: { trigger: ".process-section", start: "top 75%", end: "bottom 45%", scrub: true } });
        gsap.set(".flight-plane svg", { rotate: rtl ? -135 : 45 });
        gsap.fromTo(".flight-route-line", { scaleX: 0 }, { scaleX: 1, transformOrigin: rtl ? "right center" : "left center", ease: "none", scrollTrigger: { trigger: ".process-section", start: "top 75%", end: "bottom 45%", scrub: true } });
      }, root);
      return () => context.revert();
    });
    return () => media.revert();
  }, [locale]);
  return null;
}
