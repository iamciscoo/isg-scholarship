"use client";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";
declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: Record<string, unknown>) => string;
      remove: (id: string) => void;
    };
  }
}
export function Turnstile({
  action,
  nonce,
  onToken,
  resetKey = 0,
}: {
  action: string;
  nonce?: string;
  onToken: (value: string) => void;
  resetKey?: number;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  useEffect(() => {
    if (!ready || !container.current || !window.turnstile || !sitekey) return;
    const id = window.turnstile.render(container.current, {
      sitekey,
      action,
      theme: "light",
      size: "flexible",
      callback: onToken,
      "expired-callback": () => onToken(""),
      "error-callback": () => onToken(""),
    });
    return () => {
      window.turnstile?.remove(id);
    };
  }, [ready, sitekey, action, onToken, resetKey]);
  if (!sitekey) return null;
  return (
    <>
      <Script
        id="turnstile"
        nonce={nonce}
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        onReady={() => setReady(true)}
      />
      <div ref={container} className="mt-5" />
    </>
  );
}
