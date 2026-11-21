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

export function CountrySelect({
  id,
  name,
  defaultValue = "",
}: {
  id: string;
  name: string;
  defaultValue?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [query, setQuery] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term || term === value.toLowerCase()) return countries;
    return countries.filter((country) => country.name.toLowerCase().includes(term));
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
                aria-selected={value === country.name}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  setValue(country.name);
                  setQuery(country.name);
                  setOpen(false);
                }}
              >
                <span aria-hidden>{flag(country.code)}</span>
                {country.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}