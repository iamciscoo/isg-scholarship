import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Bookmark, CheckCircle2, Route } from "lucide-react";
import { getMessages } from "@/lib/i18n/server";
import { LanguageSelector } from "@/components/layout/language-selector";
export const metadata: Metadata = { robots: { index: false, follow: false } };
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const { ui: t } = await getMessages();
  return (
    <main id="main" className="auth-shell">
      <aside className="auth-story">
        <Image
          src="/images/campus-life.webp"
          fill
          priority
          sizes="(max-width: 900px) 100vw, 50vw"
          alt=""
          className="auth-story-photo"
        />
        <Link href="/" className="auth-brand">
          <Image src="/brand/logo.svg" width={280} height={72} alt={t.home} />
        </Link>
        <div className="auth-story-copy">
          <h2>{t.authStory}</h2>
          <p>{t.authStoryText}</p>
          <ul>
            {[t.authPoint1, t.authPoint2, t.authPoint3].map((text, i) => {
              const Icon = [CheckCircle2, Bookmark, Route][i];
              return (
                <li key={text}>
                  <Icon size={21} />
                  {text}
                </li>
              );
            })}
          </ul>
        </div>
        <small>International Scholarship Gateway</small>
      </aside>
      <section className="auth-form-side">
        <div className="auth-toolbar">
          <Link href="/" className="text-link">
            <ArrowLeft size={17} />
            {t.return}
          </Link>
          <LanguageSelector />
        </div>
        <div className="auth-card">{children}</div>
      </section>
    </main>
  );
}
