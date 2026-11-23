"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import * as Menu from "@radix-ui/react-dropdown-menu";
import { Check, ChevronDown, Globe } from "lucide-react";
import { countries, countryFlag } from "@/lib/countries";
import { useLocale } from "@/lib/i18n/provider";
import { useWorkspaceText } from "@/lib/i18n/workspace-text";

export function DestinationFlag({ name }: { name: string }) {
  const code = countries.find((country) => country.name === name)?.code;
  if (!code) return <Globe size={20} aria-hidden />;
  if (["RU", "GB", "DE", "CA", "FR", "TZ", "ES", "SA"].includes(code))
    return <Image src={`/flags/${code.toLowerCase()}.svg`} width={24} height={18} alt="" />;
  return <span aria-hidden>{countryFlag(code)}</span>;
}

export function DestinationSelect({
  name,
  id,
  options,
  defaultValue = [],
  multiple = false,
  label = "Destination interest",
}: {
  name: string;
  id?: string;
  options: string[];
  defaultValue?: string[];
  multiple?: boolean;
  label?: string;
}) {
  const [selected, setSelected] = useState(defaultValue);
  const ref = useRef<HTMLDivElement>(null);
  const initial = useRef(true);
  const { locale } = useLocale();
  const t = useWorkspaceText();
  const regions = new Intl.DisplayNames([locale], { type: "region" });
  const countryName = (value: string) => {
    const country = countries.find((country) => country.name === value);
    return country ? regions.of(country.code) || value : value;
  };
  const selectedLabel =
    selected.length === 1
      ? countryName(selected[0])
      : selected.length
        ? t("{count} destinations", { count: selected.length })
        : t("Any destination");
  useEffect(() => {
    if (initial.current) {
      initial.current = false;
      return;
    }
    ref.current?.dispatchEvent(new Event("change", { bubbles: true }));
  }, [selected]);
  return (
    <div className="destination-select" ref={ref}>
      {(selected.length ? selected : [""]).map((value) => (
        <input key={value} type="hidden" name={name} value={value} />
      ))}
      <Menu.Root>
        <Menu.Trigger
          type="button"
          id={id}
          className="destination-trigger"
          aria-label={`${t(label)}: ${selectedLabel}`}
        >
          {selected.length === 1 ? (
            <>
              <DestinationFlag name={selected[0]} />
              <span>{countryName(selected[0])}</span>
            </>
          ) : (
            <>
              <Globe size={20} />
              <span>
                {selected.length
                  ? t("{count} destinations", { count: selected.length })
                  : t("Any destination")}
              </span>
            </>
          )}
          <ChevronDown size={16} />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Content className="destination-menu" sideOffset={6} collisionPadding={12}>
            {!multiple && (
              <Menu.Item className="destination-option" onSelect={() => setSelected([])}>
                {t("Any destination")}
              </Menu.Item>
            )}
            {options.map((value) =>
              multiple ? (
                <Menu.CheckboxItem
                  key={value}
                  className="destination-option"
                  checked={selected.includes(value)}
                  onSelect={(event) => event.preventDefault()}
                  onCheckedChange={(checked) =>
                    setSelected((current) =>
                      checked ? [...current, value] : current.filter((v) => v !== value),
                    )
                  }
                >
                  <DestinationFlag name={value} />
                  <span>{countryName(value)}</span>
                  <Menu.ItemIndicator>
                    <Check size={16} />
                  </Menu.ItemIndicator>
                </Menu.CheckboxItem>
              ) : (
                <Menu.Item key={value} className="destination-option" onSelect={() => setSelected([value])}>
                  <DestinationFlag name={value} />
                  <span>{countryName(value)}</span>
                  {selected.includes(value) && <Check size={16} />}
                </Menu.Item>
              ),
            )}
          </Menu.Content>
        </Menu.Portal>
      </Menu.Root>
    </div>
  );
}
