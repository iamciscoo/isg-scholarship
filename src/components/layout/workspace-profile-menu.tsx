"use client";
import { Text, useWorkspaceText } from "@/lib/i18n/workspace-text";

import * as Menu from "@radix-ui/react-dropdown-menu";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronDown, LogOut, UserRound, type LucideIcon } from "lucide-react";
import { signOut } from "@/features/auth/sign-out";
export type WorkspaceLink = { id: string; href: string; label: string; icon: LucideIcon; current: boolean };
export type WorkspaceAccount = { name: string; avatar: string | null };
export function WorkspaceProfileMenu({
  links,
  account,
}: {
  links: WorkspaceLink[];
  account: WorkspaceAccount;
}) {
  const translate = useWorkspaceText();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 900px)");
    const close = () => {
      if (!mobile.matches) setOpen(false);
    };
    mobile.addEventListener("change", close);
    return () => mobile.removeEventListener("change", close);
  }, []);
  return (
    <div className="workspace-mobile-account">
      <Menu.Root open={open} onOpenChange={setOpen}>
        <Menu.Trigger
          className="account-menu-trigger workspace-profile-trigger"
          aria-label={translate("Workspace menu")}
        >
          <span className="account-avatar">
            {account.avatar ? (
              <Image src={account.avatar} width={36} height={36} unoptimized alt="" />
            ) : (
              <UserRound size={20} />
            )}
          </span>
          <ChevronDown size={12} />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Content
            className="account-menu language-menu workspace-profile-menu"
            align="end"
            sideOffset={8}
            collisionPadding={12}
          >
            <Menu.Label className="account-menu-name">{account.name}</Menu.Label>
            <Menu.Separator className="menu-separator" />
            {links.map((item) => (
              <Menu.Item asChild key={item.id}>
                <Link
                  className="language-option"
                  href={item.href}
                  prefetch={item.href.startsWith("/dashboard") || undefined}
                  aria-current={item.current ? "page" : undefined}
                >
                  <item.icon size={18} />
                  <span>{translate(item.label)}</span>
                </Link>
              </Menu.Item>
            ))}
            <Menu.Item asChild>
              <Link className="language-option" href="/">
                <Text>{"Back to website"}</Text>
              </Link>
            </Menu.Item>
            <Menu.Separator className="menu-separator" />
            <form action={signOut}>
              <Menu.Item asChild onSelect={(event) => event.preventDefault()}>
                <button type="submit" className="language-option account-logout">
                  <LogOut size={18} />
                  <span>
                    <Text>{"Log out"}</Text>
                  </span>
                </button>
              </Menu.Item>
            </form>
          </Menu.Content>
        </Menu.Portal>
      </Menu.Root>
    </div>
  );
}
