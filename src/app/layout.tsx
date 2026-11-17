import type { Metadata } from "next";
import localFont from "next/font/local";
import { headers } from "next/headers";
import { site } from "@/config/site";
import "./globals.css";
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
  return (
    <html lang="en" className={manrope.variable}>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
