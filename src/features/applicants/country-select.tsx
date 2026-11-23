"use client";
import { useMemo, useState } from "react";
import { useLocale } from "@/lib/i18n/provider";
import { useWorkspaceText } from "@/lib/i18n/workspace-text";

import { countries, countryFlag as flag } from "@/lib/countries";
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
}: {
  id: string;
  name: string;
  defaultValue?: string;
  mode?: "country" | "demonym";
}) {
  const { locale } = useLocale();
  const translate = useWorkspaceText();
  const regionNames = useMemo(() => new Intl.DisplayNames([locale], { type: "region" }), [locale]);
  const label = (country: { code: string; name: string }) =>
    mode === "demonym" ? (demonyms[country.code] ?? country.name) : country.name;
  const [value, setValue] = useState(defaultValue);
  const [query, setQuery] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term || term === value.toLowerCase()) return countries;
    return countries.filter((country) =>
      [country.name, regionNames.of(country.code), mode === "demonym" ? demonyms[country.code] : ""].some(
        (name) => name?.toLocaleLowerCase(locale).includes(term),
      ),
    );
  }, [query, value, regionNames, mode, locale]);
  const selected = countries.find((country) => label(country) === value);
  const visibleValue = !open && selected && locale !== "en" ? regionNames.of(selected.code) || value : query;
  return (
    <div className="country-select">
      <input type="hidden" name={name} value={value} />
      <input
        id={id}
        type="text"
        role="combobox"
        autoComplete="off"
        aria-expanded={open}
        aria-controls={`${name}-options`}
        placeholder={translate("Search for a country")}
        value={visibleValue}
        onChange={(event) => {
          setQuery(event.target.value);
          setValue("");
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && matches.length > 0 && (
        <ul className="country-list" id={`${name}-options`} role="listbox">
          {matches.slice(0, 80).map((country) => (
            <li key={country.code}>
              <button
                type="button"
                role="option"
                aria-selected={value === label(country)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  setValue(label(country));
                  setQuery(label(country));
                  setOpen(false);
                }}
              >
                <span aria-hidden>{flag(country.code)}</span>
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
