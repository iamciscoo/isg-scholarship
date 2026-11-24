"use client";
import * as Menu from "@radix-ui/react-dropdown-menu";
import Image from "next/image";
import { ChevronDown, Check } from "lucide-react";
import { useTransition } from "react";
import { useLocale } from "@/lib/i18n/provider";
import { locales, languages } from "@/lib/i18n/config";
import { setLocale } from "@/lib/i18n/actions";
export function LanguageSelector() {
  const { locale, m } = useLocale();
  const [pending, start] = useTransition();
  return (
    <Menu.Root>
      <Menu.Trigger className="language-trigger" disabled={pending} aria-label={m.ui.language}>
        <Image src={`/flags/${languages[locale].flag}.svg`} alt="" width={19} height={14} />
        <span>{locale.toUpperCase()}</span>
        <ChevronDown size={13} />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content className="language-menu" sideOffset={8} align="end">
          <Menu.RadioGroup
            value={locale}
            onValueChange={(value) =>
              start(async () => {
                await setLocale(value);
                // Server-rendered copy (heroes, sections) only changes on a fresh request.
                window.location.reload();
              })
            }
          >
            {locales.map((value) => (
              <Menu.RadioItem className="language-option" key={value} value={value} lang={value}>
                <Image src={`/flags/${languages[value].flag}.svg`} alt="" width={22} height={16} />
                <span>{languages[value].name}</span>
                <Menu.ItemIndicator>
                  <Check size={15} />
                </Menu.ItemIndicator>
              </Menu.RadioItem>
            ))}
          </Menu.RadioGroup>
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
