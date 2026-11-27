"use client";
import { Text, useWorkspaceText } from "@/lib/i18n/workspace-text";

import * as Menu from "@radix-ui/react-dropdown-menu";
import Image from "next/image";
import Link from "next/link";
import { LayoutDashboard, LogOut, UserRound } from "lucide-react";
import { signOut } from "@/features/auth/sign-out";
import { useLocale } from "@/lib/i18n/provider";
import type { AccountSummary } from "@/lib/auth/account-summary";
export function AccountMenu({ account }: { account: AccountSummary }) {
  const translate = useWorkspaceText();
  const {
    m: { ui: t },
  } = useLocale();
  if (!account)
    return (
      <Link href="/login" className="account-link" aria-label={t.signIn}>
        <UserRound size={20} />
        <span>{t.signIn}</span>
      </Link>
    );
  return (
    <Menu.Root>
      <Menu.Trigger className="account-menu-trigger" aria-label={translate("Account menu")}>
        <span className="account-avatar">
          {account.avatar ? (
            <Image src={account.avatar} width={36} height={36} unoptimized alt="" />
          ) : (
            <UserRound size={20} />
          )}
        </span>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content
          className="account-menu language-menu"
          align="end"
          sideOffset={10}
          collisionPadding={12}
        >
          <Menu.Label className="account-menu-name">{account.name}</Menu.Label>
          <Menu.Separator className="menu-separator" />
          <Menu.Item asChild>
            <Link className="language-option" href={account.href}>
              <LayoutDashboard size={17} />
              {t.workspace}
            </Link>
          </Menu.Item>
          <form action={signOut}>
            <Menu.Item asChild onSelect={(event) => event.preventDefault()}>
              <button className="language-option account-logout" type="submit">
                <LogOut size={17} />
                <Text>{"Log out"}</Text>
              </button>
            </Menu.Item>
          </form>
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
