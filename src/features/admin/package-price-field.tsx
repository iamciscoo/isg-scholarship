"use client";
import { useState } from "react";
import { usdLabel } from "@/lib/format";

export function PackagePriceField({ defaultValue }: { defaultValue?: number }) {
  const [value, setValue] = useState(defaultValue ? String(defaultValue) : "");
  const amount = Number(value);
  return (
    <label>
      ISG package fee (TZS)
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
          ? `USD quote · ${usdLabel(amount)}`
          : "Enter the full fee for this package. The consultation is charged separately."}
      </small>
    </label>
  );
}
