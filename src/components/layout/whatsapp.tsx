"use client";
import { useLocale } from "@/lib/i18n/provider";
export function WhatsApp() {
  const { m } = useLocale();
  return (
    <a
      className="whatsapp-floater"
      href="https://wa.me/79282120121"
      target="_blank"
      rel="noopener noreferrer"
      aria-label={m.ui.whatsapp}
      title={`${m.ui.whatsapp} · +7 928 212 01 21`}
    >
      <span className="whatsapp-help">{m.ui.needHelp}</span>
      <svg viewBox="0 0 32 32" width="29" height="29" fill="currentColor" aria-hidden="true">
        <path d="M16 .8A15 15 0 0 0 3 23.3L.9 31l7.9-2.1A15 15 0 1 0 16 .8Zm0 27.4c-2.3 0-4.5-.6-6.4-1.8l-.5-.3-4.7 1.2 1.3-4.6-.3-.5A12.4 12.4 0 1 1 16 28.2Zm6.8-9.3c-.4-.2-2.2-1.1-2.6-1.2-.3-.1-.6-.2-.8.2-.3.4-1 1.2-1.2 1.4-.2.2-.4.3-.8.1a10.2 10.2 0 0 1-5.1-4.4c-.4-.7.4-.6 1.1-2.1.1-.2 0-.5 0-.7l-1.2-2.8c-.3-.7-.6-.6-.8-.6h-.7c-.3 0-.7.1-1 .5s-1.3 1.3-1.3 3.1 1.3 3.5 1.5 3.7c.2.3 2.6 4 6.3 5.6 2.3 1 3.2 1.1 4.4.9.7-.1 2.2-.9 2.5-1.8.3-.9.3-1.7.2-1.8-.1-.2-.3-.2-.7-.4Z" />
      </svg>
    </a>
  );
}
