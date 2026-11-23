"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import * as Menu from "@radix-ui/react-dropdown-menu";
import * as Popover from "@radix-ui/react-popover";
import { Check, ChevronDown, Globe } from "lucide-react";
import { countries } from "@/lib/countries";
import { useLocale } from "@/lib/i18n/provider";
import { useWorkspaceText } from "@/lib/i18n/workspace-text";

const countryCodes = new Map(countries.map(({ name, code }) => [name, code]));

export function DestinationFlag({ name }: { name: string }) {
  const code = countryCodes.get(name);
  if (!code) return <Globe size={20} aria-hidden />;
  return <Image src={`/flags/${code.toLowerCase()}.svg`} width={24} height={18} alt="" />;
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
    const code = countryCodes.get(value);
    return (code && regions.of(code)) || value;
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
  const trigger = (
    <button
      type="button"
      id={id}
      className="destination-trigger"
      aria-label={`${t(label)}: ${selectedLabel}`}
    >
      {selected.length === 1 ? <DestinationFlag name={selected[0]} /> : <Globe size={20} aria-hidden />}
      <span>{selectedLabel}</span>
      <ChevronDown size={16} aria-hidden />
    </button>
  );
  return (
    <div className="destination-select" ref={ref}>
      {(selected.length ? selected : [""]).map((value) => (
        <input key={value} type="hidden" name={name} value={value} />
      ))}
      {multiple ? (
        <Popover.Root>
          <Popover.Trigger asChild>{trigger}</Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              className="destination-menu destination-search-menu"
              sideOffset={6}
              collisionPadding={12}
              aria-label={t(label)}
            >
              <DestinationChoices
                options={options}
                countryName={countryName}
                selected={selected}
                toggle={(value, checked) =>
                  setSelected((current) =>
                    checked ? [...current, value] : current.filter((country) => country !== value),
                  )
                }
              />
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      ) : (
        <Menu.Root>
          <Menu.Trigger asChild>{trigger}</Menu.Trigger>
          <Menu.Portal>
            <Menu.Content className="destination-menu" sideOffset={6} collisionPadding={12}>
              <Menu.Item className="destination-option" onSelect={() => setSelected([])}>
                {t("Any destination")}
              </Menu.Item>
              {options.map((value) => (
                <Menu.Item key={value} className="destination-option" onSelect={() => setSelected([value])}>
                  <DestinationFlag name={value} />
                  <span>{countryName(value)}</span>
                  {selected.includes(value) && <Check size={16} />}
                </Menu.Item>
              ))}
            </Menu.Content>
          </Menu.Portal>
        </Menu.Root>
      )}
    </div>
  );
}

function DestinationChoices({
  options,
  countryName,
  selected,
  toggle,
}: {
  options: string[];
  countryName: (value: string) => string;
  selected: string[];
  toggle: (value: string, checked: boolean) => void;
}) {
  const { locale } = useLocale();
  const t = useWorkspaceText();
  const [query, setQuery] = useState("");
  const list = useRef<HTMLDivElement>(null);
  const normalize = (value: string) => value.toLocaleLowerCase(locale).normalize("NFD").replace(/\p{M}/gu, "");
  const term = normalize(query.trim());
  const results = options.filter(
    (value) =>
      !term ||
      normalize(value).includes(term) ||
      normalize(countryName(value)).includes(term) ||
      countryCodes.get(value)?.toLowerCase() === term,
  );
  return (
    <>
      <input
        type="search"
        className="input"
        aria-label={t("Search for a country")}
        placeholder={t("Search for a country")}
        autoComplete="off"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          list.current?.scrollTo({ top: 0 });
        }}
      />
      <div className="destination-search-results" ref={list}>
        {results.length === 0 && <p role="status">{t("No countries found.")}</p>}
        {results.map((value) => (
          <label
            className="destination-option"
            key={value}
            data-state={selected.includes(value) ? "checked" : undefined}
          >
            <DestinationFlag name={value} />
            <span>{countryName(value)}</span>
            <input
              type="checkbox"
              checked={selected.includes(value)}
              onChange={(event) => toggle(value, event.target.checked)}
            />
          </label>
        ))}
      </div>
    </>
  );
}
