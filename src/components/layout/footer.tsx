import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { site } from "@/config/site";
import { getMessages } from "@/lib/i18n/server";
export async function Footer() {
  const { ui: t, home: h } = await getMessages();
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link href="/">
              <Image src="/brand/logo.svg" width={290} height={74} alt={site.name} />
            </Link>
            <p>{h.ctaText}</p>
            <a href={`mailto:${site.email}`}>
              {site.email} <ArrowUpRight size={15} />
            </a>
          </div>
          <div>
            <h2>Explore</h2>
            <Link href="/about">{t.about}</Link>
            <Link href="/services">{t.services}</Link>
            <Link href="/pathways">{t.pathways}</Link>
            <Link href="/how-it-works">{t.journey}</Link>
          </div>
          <div>
            <h2>Your next step</h2>
            <Link href="/consultation">{t.eligibility}</Link>
            <Link href="/contact">{t.advisor}</Link>
            <Link href="/pricing">{t.fees}</Link>
            <Link href="/faqs">{t.faq}</Link>
          </div>
          <div>
            <h2>Your account</h2>
            <Link href="/login">{t.signIn}</Link>
            <Link href="/register">{t.createAccount}</Link>
            <Link href="/contact?topic=privacy">Personal data requests</Link>
            <Link href="/login?next=/admin">Staff sign in</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} International Scholarship Gateway</span>
          <div>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/cookies">Cookies</Link>
          </div>
        </div>
        <p className="footer-disclaimer">
          ISG provides independent education advisory and application support. Scholarship, admission and visa
          decisions rest with the relevant institutions. No outcome is guaranteed.
        </p>
      </div>
    </footer>
  );
}
