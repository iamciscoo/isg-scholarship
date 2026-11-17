"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { navigation } from "@/config/site";
import { Button } from "@/components/ui/button";

export function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  return <header className="site-header">
    <div className="container header-inner">
      <Link href="/" aria-label="ISG home" onClick={() => setOpen(false)} className="brand">
        <Image src="/brand/logo.svg" width={280} height={72} priority alt="International Scholarship Gateway" />
      </Link>
      <nav aria-label="Main navigation" className="desktop-nav">
        {navigation.map(item => <Link key={item.href} href={item.href} aria-current={pathname === item.href ? "page" : undefined}>{item.label}</Link>)}
      </nav>
      <div className="header-actions"><Link className="login-link" href="/login">Sign in</Link>
        <Button asChild size="sm"><Link href="/eligibility">Check eligibility <ArrowUpRight size={16} /></Link></Button>
      </div>
      <button className="menu-toggle" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
    </div>
    {open && <nav id="mobile-menu" className="mobile-nav" aria-label="Mobile navigation">
      {[...navigation, { href: "/pricing", label: "Service fees" }, { href: "/contact", label: "Contact" }, { href: "/login", label: "Sign in" }].map(item => <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>{item.label}</Link>)}
      <Link href="/eligibility" onClick={() => setOpen(false)}>Check eligibility <ArrowUpRight size={18} /></Link>
    </nav>}
  </header>;
}
