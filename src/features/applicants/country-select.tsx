"use client";
import { useMemo, useState, type Ref } from "react";
import { useLocale } from "@/lib/i18n/provider";
import { useWorkspaceText } from "@/lib/i18n/workspace-text";

import { countries } from "@/lib/countries";
import { CountryFlag } from "@/components/ui/country-flag";
// Nationality reads as a demonym: picking Tanzania stores "Tanzanian". Unknown codes fall back to the name.
const demonyms: Record<string, string> = {
  TZ: "Tanzanian",
  KE: "Kenyan",
  UG: "Ugandan",
  RW: "Rwandan",
  BI: "Burundian",
  SS: "South Sudanese",
  SD: "Sudanese",
  ET: "Ethiopian",
  ER: "Eritrean",
  SO: "Somali",
  DJ: "Djiboutian",
  EG: "Egyptian",
  LY: "Libyan",
  TN: "Tunisian",
  DZ: "Algerian",
  MA: "Moroccan",
  NG: "Nigerian",
  GH: "Ghanaian",
  SN: "Senegalese",
  ML: "Malian",
  BF: "Burkinabé",
  NE: "Nigerien",
  TD: "Chadian",
  CM: "Cameroonian",
  CF: "Central African",
  GA: "Gabonese",
  CG: "Congolese",
  CD: "Congolese",
  AO: "Angolan",
  ZM: "Zambian",
  ZW: "Zimbabwean",
  MW: "Malawian",
  MZ: "Mozambican",
  MG: "Malagasy",
  MU: "Mauritian",
  SC: "Seychellois",
  KM: "Comorian",
  ZA: "South African",
  NA: "Namibian",
  GM: "Gambian",
  GN: "Guinean",
  SL: "Sierra Leonean",
  LR: "Liberian",
  TG: "Togolese",
  BJ: "Beninese",
  CI: "Ivorian",
  MR: "Mauritanian",
  CV: "Cape Verdean",
  GB: "British",
  IE: "Irish",
  FR: "French",
  DE: "German",
  IT: "Italian",
  ES: "Spanish",
  PT: "Portuguese",
  NL: "Dutch",
  BE: "Belgian",
  CH: "Swiss",
  AT: "Austrian",
  SE: "Swedish",
  NO: "Norwegian",
  DK: "Danish",
  FI: "Finnish",
  PL: "Polish",
  CZ: "Czech",
  SK: "Slovak",
  HU: "Hungarian",
  RO: "Romanian",
  BG: "Bulgarian",
  GR: "Greek",
  TR: "Turkish",
  RU: "Russian",
  UA: "Ukrainian",
  BY: "Belarusian",
  LT: "Lithuanian",
  LV: "Latvian",
  EE: "Estonian",
  HR: "Croatian",
  RS: "Serbian",
  BA: "Bosnian",
  AL: "Albanian",
  MK: "Macedonian",
  SI: "Slovenian",
  IS: "Icelandic",
  MT: "Maltese",
  CY: "Cypriot",
  LU: "Luxembourgish",
  IN: "Indian",
  PK: "Pakistani",
  BD: "Bangladeshi",
  LK: "Sri Lankan",
  NP: "Nepali",
  CN: "Chinese",
  JP: "Japanese",
  KR: "South Korean",
  KP: "North Korean",
  MN: "Mongolian",
  VN: "Vietnamese",
  TH: "Thai",
  MY: "Malaysian",
  SG: "Singaporean",
  ID: "Indonesian",
  PH: "Filipino",
  MM: "Burmese",
  KH: "Cambodian",
  LA: "Lao",
  BN: "Bruneian",
  AE: "Emirati",
  SA: "Saudi",
  QA: "Qatari",
  KW: "Kuwaiti",
  BH: "Bahraini",
  OM: "Omani",
  YE: "Yemeni",
  JO: "Jordanian",
  LB: "Lebanese",
  SY: "Syrian",
  IQ: "Iraqi",
  IR: "Iranian",
  IL: "Israeli",
  PS: "Palestinian",
  AF: "Afghan",
  KZ: "Kazakh",
  UZ: "Uzbek",
  KG: "Kyrgyz",
  TJ: "Tajik",
  TM: "Turkmen",
  AZ: "Azerbaijani",
  AM: "Armenian",
  GE: "Georgian",
  US: "American",
  CA: "Canadian",
  MX: "Mexican",
  BR: "Brazilian",
  AR: "Argentine",
  CL: "Chilean",
  PE: "Peruvian",
  CO: "Colombian",
  VE: "Venezuelan",
  EC: "Ecuadorian",
  BO: "Bolivian",
  PY: "Paraguayan",
  UY: "Uruguayan",
  CU: "Cuban",
  HT: "Haitian",
  DO: "Dominican",
  JM: "Jamaican",
  TT: "Trinidadian",
  AU: "Australian",
  NZ: "New Zealander",
  FJ: "Fijian",
  PG: "Papua New Guinean",
};

export function CountrySelect({
  id,
  name,
  defaultValue = "",
  mode = "country",
  onValueChange,
  onBlur,
  inputRef,
  invalid,
  describedBy,
}: {
  id: string;
  name: string;
  defaultValue?: string;
  mode?: "country" | "demonym";
  onValueChange?: (value: string) => void;
  onBlur?: () => void;
  inputRef?: Ref<HTMLInputElement>;
  invalid?: boolean;
  describedBy?: string;
}) {
  const { locale } = useLocale();
  const translate = useWorkspaceText();
  const regionNames = useMemo(() => new Intl.DisplayNames([locale], { type: "region" }), [locale]);
  const label = (country: { code: string; name: string }) =>
    mode === "demonym" ? (demonyms[country.code] ?? country.name) : country.name;
  const [value, setValue] = useState(defaultValue);
  const [query, setQuery] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const matches = useMemo(() => {
    const normalize = (text: string) =>
      text.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase(locale);
    const term = normalize(query.trim());
    if (!term || term === normalize(value)) return countries;
    return countries.filter(
      (country) =>
        country.code.toLowerCase() === term ||
        [country.name, regionNames.of(country.code), mode === "demonym" ? demonyms[country.code] : ""].some(
          (name) => name && normalize(name).includes(term),
        ),
    );
  }, [query, value, regionNames, mode, locale]);
  const selected = countries.find((country) => label(country) === value || country.name === value);
  const visibleValue = !open && selected && locale !== "en" ? regionNames.of(selected.code) || value : query;
  const optionId = (index: number) => `${id}-option-${index}`;
  const choose = (country: (typeof countries)[number]) => {
    const next = label(country);
    setValue(next);
    setQuery(next);
    setOpen(false);
    setActive(-1);
    onValueChange?.(next);
    onBlur?.();
  };
  return (
    <div className="country-select">
      {!onValueChange && <input type="hidden" name={name} value={value} />}
      <input
        ref={inputRef}
        id={id}
        className={selected ? "country-input-with-flag" : undefined}
        type="text"
        role="combobox"
        autoComplete="off"
        aria-expanded={open}
        aria-controls={open ? `${id}-options` : undefined}
        aria-activedescendant={open && active >= 0 ? optionId(active) : undefined}
        aria-autocomplete="list"
        aria-invalid={invalid}
        aria-describedby={describedBy}
        placeholder={translate("Search for a country")}
        value={visibleValue}
        onChange={(event) => {
          setQuery(event.target.value);
          setValue("");
          onValueChange?.("");
          setActive(-1);
          setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
          setActive(-1);
        }}
        onBlur={() => {
          setOpen(false);
          setQuery(value);
          onBlur?.();
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
            setActive(-1);
            return;
          }
          if (open && event.key === "Enter" && matches[active]) {
            event.preventDefault();
            choose(matches[active]);
            return;
          }
          if ((event.key === "ArrowDown" || event.key === "ArrowUp") && matches.length) {
            event.preventDefault();
            const change = event.key === "ArrowDown" ? 1 : -1;
            const next = Math.min(matches.length - 1, Math.max(0, active + change));
            setOpen(true);
            setActive(next);
            requestAnimationFrame(() =>
              document.getElementById(optionId(next))?.scrollIntoView({ block: "nearest" }),
            );
          }
        }}
      />
      {selected && (
        <span className="country-selected-flag">
          <CountryFlag code={selected.code} eager />
        </span>
      )}
      {open && (
        <ul className="country-list" id={`${id}-options`} role="listbox" aria-labelledby={id}>
          {!matches.length && (
            <li className="country-empty" role="presentation">
              {translate("No countries found.")}
            </li>
          )}
          {matches.map((country, index) => (
            <li key={country.code} role="presentation">
              <button
                id={optionId(index)}
                type="button"
                role="option"
                tabIndex={-1}
                data-highlighted={active === index || undefined}
                aria-selected={value === label(country)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(country)}
              >
                <CountryFlag code={country.code} />
                {regionNames.of(country.code) || country.name}
                {mode === "demonym" && locale === "en" && <small>{label(country)}</small>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
