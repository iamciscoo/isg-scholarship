"use client";
import { createContext, useContext, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Bell, ClipboardList, Home, Mail, CircleCheck, UserRound, ImageIcon, LogOut } from "lucide-react";
import { LanguageSelector } from "./language-selector";
import { NotificationBell } from "@/features/notifications/bell";
import { signOut } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import type { Role } from "@/lib/auth/permissions";
import { WorkspaceProfileMenu, type WorkspaceAccount } from "./workspace-profile-menu";
type WorkspaceProps = {
  children: React.ReactNode;
  role: Role;
  email: string;
  active?: string;
  account?: WorkspaceAccount;
};
const WorkspaceContext = createContext(false);
export function Workspace(props: WorkspaceProps) {
  const hosted = useContext(WorkspaceContext);
  return hosted ? props.children : <WorkspaceFrame {...props} />;
}
export function WorkspaceLayout(props: WorkspaceProps) {
  return (
    <WorkspaceContext.Provider value={true}>
      <WorkspaceFrame {...props} />
    </WorkspaceContext.Provider>
  );
}
function WorkspaceFrame({ children, role, email, active = "overview", account }: WorkspaceProps) {
  const pathname = usePathname();
  const content = useRef<HTMLElement>(null);
  useEffect(() => {
    content.current?.scrollTo({ top: 0 });
  }, [pathname]);
  const staff = role !== "applicant";
  const base = role === "admin" ? "/admin" : "/advisor";
  const links = staff
    ? [
        {
          href: role === "admin" ? "/admin/consultations" : base,
          label: "Consultations",
          icon: ClipboardList,
          id: "overview",
        },
        { href: "/dashboard/profile", label: "My profile", icon: UserRound, id: "profile" },

        ...(role === "admin"
          ? [
              { href: "/admin/inbox", label: "Your notifications", icon: Bell, id: "inbox" },
              { href: "/admin/payments", label: "Payments", icon: ClipboardList, id: "payments" },
              {
                href: "/admin/packages",
                label: "Scholarship packages",
                icon: ClipboardList,
                id: "packages",
              },
              {
                href: "/admin/promotions",
                label: "Public promotions",
                icon: ClipboardList,
                id: "promotions",
              },
              { href: "/admin/enquiries", label: "Contact enquiries", icon: Mail, id: "enquiries" },
              { href: "/admin/audit", label: "Activity & delivery", icon: CircleCheck, id: "audit" },
              { href: "/admin/notifications", label: "User notifications", icon: Bell, id: "notifications" },
              { href: "/admin/settings", label: "Team & notifications", icon: CircleCheck, id: "settings" },
              { href: "/admin/website", label: "Website images", icon: ImageIcon, id: "website" },
            ]
          : []),
        { href: `${base}/applications`, label: "Applications", icon: ClipboardList, id: "applications" },
      ]
    : [
        { href: "/dashboard", label: "My overview", icon: Home, id: "overview" },
        { href: "/dashboard/profile", label: "My profile", icon: UserRound, id: "profile" },
        {
          href: "/dashboard/consultations",
          label: "Consultations",
          icon: ClipboardList,
          id: "consultations",
        },
        { href: "/dashboard/applications", label: "Applications", icon: ClipboardList, id: "applications" },
      ];
  const navigation = links.map((item) => ({
    ...item,
    current: Boolean(
      pathname === item.href ||
      (item.id === "applications" && pathname === "/dashboard/application") ||
      (item.href !== "/dashboard" && item.href !== "/advisor" && pathname.startsWith(item.href + "/")) ||
      (item.id === "overview" &&
        staff &&
        (pathname === base ||
          pathname.startsWith(base + "/leads/") ||
          pathname.startsWith(base + "/cases/"))) ||
      (!pathname && active === item.id),
    ),
  }));
  return (
    <div className="workspace">
      <aside className="workspace-sidebar">
        <Link href="/" className="workspace-home" aria-label="ISG home" prefetch>
          <Image src="/brand/logo.svg" width={200} height={52} alt="ISG home" />
        </Link>
        <div className="workspace-label">{staff ? "Staff workspace" : "My ISG"}</div>
        <nav aria-label="Workspace navigation">
          {navigation.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              prefetch={true}
              aria-current={item.current ? "page" : undefined}
            >
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
            <WorkspaceProfileMenu
              links={navigation}
              account={account || { name: email || "ISG account", avatar: null }}
            />
            <form action={signOut} className="workspace-desktop-logout">
              <Button size="sm" variant="outline" aria-label="Sign out">
                <LogOut size={16} />
                <span className="workspace-signout-label">Sign out</span>
              </Button>
            </form>
          </div>
        </header>
        <main id="main" className="workspace-content" ref={content}>
          {children}
        </main>
      </div>
    </div>
  );
}
