"use client";
import { createContext, useContext } from "react";
import type { Locale } from "./config";
import type { Messages } from "./messages";
const Context = createContext<{ locale: Locale; m: Messages } | null>(null);
export function LocaleProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Messages;
  children: React.ReactNode;
}) {
  return <Context.Provider value={{ locale, m: messages }}>{children}</Context.Provider>;
}
export function useLocale() {
  const context = useContext(Context);
  if (!context) throw new Error("LocaleProvider is missing.");
  return context;
}
