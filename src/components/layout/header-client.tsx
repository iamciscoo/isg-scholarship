"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { AccountMenu } from "./account-menu";
import { Button } from "@/components/ui/button";
import { LanguageSelector } from "./language-selector";
import { NotificationBell } from "@/features/notifications/bell";
import { useLocale } from "@/lib/i18n/provider";
import type { AccountSummary } from "@/lib/auth/account-summary";
export function HeaderClient({ account }: { account: AccountSummary }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const {
    m: { ui: t },
  } = useLocale();
  const navigation = [
    { href: "/about", label: t.about },
    { href: "/services", label: t.services },
    { href: "/how-it-works", label: t.journey },
    { href: "/pathways", label: t.pathways },
  ];
  return (
    <div className="site-header-shell">
      <header className="site-header">
        <div className="utility-strip">
          <div className="container utility-inner">
            <div className="utility-links">
              <Link href="/contact">{t.contact}</Link>
              <Link href="/faqs">{t.faq}</Link>
            </div>
            <div className="utility-controls">
              <NotificationBell signedIn={Boolean(account)} />
              <LanguageSelector />
            </div>
          </div>
        </div>
        <div className="container header-inner">
          <Link
            href="/"
            aria-label={t.home}
            onClick={(event) => {
              setOpen(false);
              if (
                pathname === "/" &&
                !event.ctrlKey &&
                !event.metaKey &&
                !event.shiftKey &&
                !event.altKey &&
                event.button === 0
              ) {
                event.preventDefault();
                window.scrollTo({
                  top: 0,
                  behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
                });
              }
            }}
            className="brand"
          >
            <Image
              src="/brand/logo.svg"
              width={280}
              height={72}
              priority
              alt="International Scholarship Gateway"
            />
          </Link>
          <nav aria-label="Main navigation" className="desktop-nav">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={pathname === item.href ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="account-actions">
            <Button asChild size="sm" className="header-eligibility">
              <Link href="/consultation">
                {t.eligibility}
                <ArrowUpRight size={16} />
              </Link>
            </Button>
            <button
              className="menu-toggle"
              aria-label={open ? t.closeMenu : t.openMenu}
              aria-expanded={open}
              aria-controls="mobile-menu"
              onClick={() => setOpen(!open)}
            >
              {open ? <X /> : <Menu />}
            </button>
            <AccountMenu account={account} />
          </div>
        </div>
        {open && (
          <nav id="mobile-menu" className="mobile-nav" aria-label="Mobile navigation">
            {[
              ...navigation,
              { href: "/pricing", label: t.fees },
              { href: "/contact", label: t.contact },
              { href: "/consultation", label: t.eligibility },
            ].map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>
                {item.label}
              </Link>
            ))}
          </nav>
        )}
      </header>
    </div>
  );
}
