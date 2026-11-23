"use client";
import { Text, useWorkspaceText } from "@/lib/i18n/workspace-text";

import { useState } from "react";
import { usdLabel } from "@/lib/format";

export function PackagePriceField({ defaultValue }: { defaultValue?: number }) {
  const translate = useWorkspaceText();
  const [value, setValue] = useState(defaultValue ? String(defaultValue) : "");
  const amount = Number(value);
  return (
    <label>
      <Text>{"ISG package fee (TZS)"}</Text>
      <input
        name="packageFee"
        type="number"
        min={0}
        max={100000000}
        step={1}
        defaultValue={defaultValue ?? ""}
        onChange={(event) => setValue(event.target.value)}
        required
      />
      <small>
        {amount > 0
          ? usdLabel(amount)
          : translate("Enter the full fee for this package. The consultation is charged separately.")}
      </small>
    </label>
  );
}
