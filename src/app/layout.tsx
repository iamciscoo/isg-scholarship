import type { Metadata } from "next";
import localFont from "next/font/local";
import { headers } from "next/headers";
import { site } from "@/config/site";
import "./globals.css";
import { getLocale, getMessages } from "@/lib/i18n/server";
import { LocaleProvider } from "@/lib/i18n/provider";
import { WhatsApp } from "@/components/layout/whatsapp";
const manrope = localFont({
  src: "../../public/fonts/Manrope.ttf",
  variable: "--font-manrope",
  display: "swap",
});
export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: "ISG | Your next chapter, without borders", template: "%s | ISG Scholarship" },
  description:
    "Personalized international scholarship guidance and application support. Start with an initial assessment and take your next step with ISG.",
  icons: { icon: "/favicon.svg", apple: "/apple-touch-icon.png" },
  openGraph: {
    type: "website",
    siteName: site.name,
    title: "Your next chapter, without borders",
    description: "International scholarship guidance, with you at every step.",
  },
};
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await headers(); // Render with the per-request CSP nonce supplied by proxy.
  const [locale, messages] = await Promise.all([getLocale(), getMessages()]);
  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} className={manrope.variable}>
      <body>
        <a className="skip-link" href="#main">
          {messages.ui.skip}
        </a>
        <LocaleProvider locale={locale} messages={messages}>
          {children}
          <WhatsApp />
        </LocaleProvider>
      </body>
    </html>
  );
}
