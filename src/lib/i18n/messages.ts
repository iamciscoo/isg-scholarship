import en from "./locales/en.json";
import fr from "./locales/fr.json";
import sw from "./locales/sw.json";
import ru from "./locales/ru.json";
import es from "./locales/es.json";
import ar from "./locales/ar.json";
import type { Locale } from "./config";
export type Messages = typeof en;
export const dictionaries: Record<Locale, Messages> = { en, fr, sw, ru, es, ar };
