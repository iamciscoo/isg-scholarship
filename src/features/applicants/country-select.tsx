"use client";
import { useMemo, useState } from "react";

const codes =
  "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW".split(
    " ",
  );
const display = new Intl.DisplayNames(["en"], { type: "region" });
const countries = codes
  .map((code) => ({ code, name: display.of(code) ?? code }))
  .filter((country) => country.name !== country.code)
  .sort((a, b) => a.name.localeCompare(b.name));
const flag = (code: string) =>
  String.fromCodePoint(...[...code].map((letter) => 0x1f1e6 + letter.charCodeAt(0) - 65));
// Nationality reads as a demonym: picking Tanzania stores "Tanzanian". Unknown codes fall back to the name.
const demonyms: Record<string, string> = {
  TZ: "Tanzanian", KE: "Kenyan", UG: "Ugandan", RW: "Rwandan", BI: "Burundian", SS: "South Sudanese",
  SD: "Sudanese", ET: "Ethiopian", ER: "Eritrean", SO: "Somali", DJ: "Djiboutian", EG: "Egyptian",
  LY: "Libyan", TN: "Tunisian", DZ: "Algerian", MA: "Moroccan", NG: "Nigerian", GH: "Ghanaian",
  SN: "Senegalese", ML: "Malian", BF: "Burkinabé", NE: "Nigerien", TD: "Chadian", CM: "Cameroonian",
  CF: "Central African", GA: "Gabonese", CG: "Congolese", CD: "Congolese", AO: "Angolan", ZM: "Zambian",
  ZW: "Zimbabwean", MW: "Malawian", MZ: "Mozambican", MG: "Malagasy", MU: "Mauritian",
  SC: "Seychellois", KM: "Comorian", ZA: "South African", NA: "Namibian", GM: "Gambian", GN: "Guinean",
  SL: "Sierra Leonean", LR: "Liberian", TG: "Togolese", BJ: "Beninese", CI: "Ivorian", MR: "Mauritanian",
  CV: "Cape Verdean", GB: "British", IE: "Irish", FR: "French", DE: "German", IT: "Italian", ES: "Spanish",
  PT: "Portuguese", NL: "Dutch", BE: "Belgian", CH: "Swiss", AT: "Austrian", SE: "Swedish", NO: "Norwegian",
  DK: "Danish", FI: "Finnish", PL: "Polish", CZ: "Czech", SK: "Slovak", HU: "Hungarian", RO: "Romanian",
  BG: "Bulgarian", GR: "Greek", TR: "Turkish", RU: "Russian", UA: "Ukrainian", BY: "Belarusian",
  LT: "Lithuanian", LV: "Latvian", EE: "Estonian", HR: "Croatian", RS: "Serbian", BA: "Bosnian",
  AL: "Albanian", MK: "Macedonian", SI: "Slovenian", IS: "Icelandic", MT: "Maltese", CY: "Cypriot",
  LU: "Luxembourgish", IN: "Indian", PK: "Pakistani", BD: "Bangladeshi", LK: "Sri Lankan", NP: "Nepali",
  CN: "Chinese", JP: "Japanese", KR: "South Korean", KP: "North Korean", MN: "Mongolian", VN: "Vietnamese",
  TH: "Thai", MY: "Malaysian", SG: "Singaporean", ID: "Indonesian", PH: "Filipino", MM: "Burmese",
  KH: "Cambodian", LA: "Lao", BN: "Bruneian", AE: "Emirati", SA: "Saudi", QA: "Qatari", KW: "Kuwaiti",
  BH: "Bahraini", OM: "Omani", YE: "Yemeni", JO: "Jordanian", LB: "Lebanese", SY: "Syrian", IQ: "Iraqi",
  IR: "Iranian", IL: "Israeli", PS: "Palestinian", AF: "Afghan", KZ: "Kazakh", UZ: "Uzbek", KG: "Kyrgyz",
  TJ: "Tajik", TM: "Turkmen", AZ: "Azerbaijani", AM: "Armenian", GE: "Georgian", US: "American",
  CA: "Canadian", MX: "Mexican", BR: "Brazilian", AR: "Argentine", CL: "Chilean", PE: "Peruvian",
  CO: "Colombian", VE: "Venezuelan", EC: "Ecuadorian", BO: "Bolivian", PY: "Paraguayan", UY: "Uruguayan",
  CU: "Cuban", HT: "Haitian", DO: "Dominican", JM: "Jamaican", TT: "Trinidadian", AU: "Australian",
  NZ: "New Zealander", FJ: "Fijian", PG: "Papua New Guinean",
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
  const label = (country: { code: string; name: string }) =>
    mode === "demonym" ? (demonyms[country.code] ?? country.name) : country.name;
  const [value, setValue] = useState(defaultValue);
  const [query, setQuery] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term || term === value.toLowerCase()) return countries;
    return countries.filter(
      (country) => country.name.toLowerCase().includes(term) || label(country).toLowerCase().includes(term),
    );
  }, [query, value]);
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
        placeholder="Search for a country"
        value={query}
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
                {country.name}
                {mode === "demonym" && <small>{label(country)}</small>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}