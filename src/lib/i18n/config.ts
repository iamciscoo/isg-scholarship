export const locales = ["en", "fr", "sw", "ru", "es", "ar"] as const;
export type Locale = (typeof locales)[number];
export const languages: Record<Locale, { name: string; flag: string }> = {
  en: { name: "English", flag: "gb" },
  fr: { name: "Français", flag: "fr" },
  sw: { name: "Kiswahili", flag: "tz" },
  ru: { name: "Русский", flag: "ru" },
  es: { name: "Español", flag: "es" },
  ar: { name: "العربية", flag: "sa" },
};
export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && locales.includes(value as Locale);
}
