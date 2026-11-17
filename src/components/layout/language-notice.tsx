"use client";
import { usePathname } from "next/navigation";
import { useLocale } from "@/lib/i18n/provider";
export function LanguageNotice() {
  const pathname = usePathname();
  const { locale, m } = useLocale();
  return locale !== "en" && !["/", "/faqs"].includes(pathname) ? (
    <p className="container language-notice" role="status">
      {m.ui.detailsEnglish}
    </p>
  ) : null;
}
