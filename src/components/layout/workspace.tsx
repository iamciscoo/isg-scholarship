import Image from "next/image";
import Link from "next/link";
import { Bell, ClipboardList, Home, Mail, ShieldCheck, UserRound } from "lucide-react";
import { LanguageSelector } from "./language-selector";
import { NotificationBell } from "@/features/notifications/bell";
import { signOut } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import type { Role } from "@/lib/auth/permissions";
export function Workspace({
  children,
  role,
  email,
  active = "overview",
}: {
  children: React.ReactNode;
  role: Role;
  email: string;
  active?: string;
}) {
  const staff = role !== "applicant";
  const base = role === "admin" ? "/admin" : "/advisor";
  const links = staff
    ? [
        { href: base, label: "Lead workspace", icon: ClipboardList, id: "overview" },
        ...(role === "admin"
          ? [
              { href: "/admin/enquiries", label: "Contact enquiries", icon: Mail, id: "enquiries" },
              { href: "/admin/audit", label: "Activity & delivery", icon: ShieldCheck, id: "audit" },
              { href: "/admin/notifications", label: "User notifications", icon: Bell, id: "notifications" },
              { href: "/admin/settings", label: "Team & notifications", icon: ShieldCheck, id: "settings" },
            ]
          : []),
        { href: "/dashboard/profile", label: "My profile", icon: UserRound, id: "profile" },
      ]
    : [
        { href: "/dashboard", label: "My overview", icon: Home, id: "overview" },
        { href: "/dashboard/profile", label: "My profile", icon: UserRound, id: "profile" },
      ];
  return (
    <div className="workspace">
      <aside className="workspace-sidebar">
        <Link href="/">
          <Image src="/brand/logo.svg" width={200} height={52} alt="ISG home" />
        </Link>
        <div className="workspace-label">{staff ? "Staff workspace" : "My ISG"}</div>
        <nav aria-label="Workspace navigation">
          {links.map((item) => (
            <Link key={item.id} href={item.href} aria-current={active === item.id ? "page" : undefined}>
              <item.icon size={18} />
              {item.label}
            </Link>
          ))}
          <Link href="/">Back to website</Link>
        </nav>
      </aside>
      <div className="workspace-main">
        <header className="workspace-top">
          <span>{staff ? "Private staff workspace" : "Your applicant account"}</span>
          <div className="workspace-action-row">
            <div className="workspace-utilities">
              <NotificationBell signedIn />
              <LanguageSelector />
            </div>
            <span>{email}</span>
            <form action={signOut}>
              <Button size="sm" variant="outline">
                Sign out everywhere
              </Button>
            </form>
          </div>
        </header>
        <main id="main" className="workspace-content">
          {children}
        </main>
      </div>
    </div>
  );
}
