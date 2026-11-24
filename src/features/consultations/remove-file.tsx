"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function RemoveFile({ id }: { id: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "confirm" | "busy" | "error">("idle");
  if (state === "error") return <span className="file-remove-error">Could not remove this file.</span>;
  if (state === "confirm")
    return (
      <>
        <button
          type="button"
          className="file-remove is-armed"
          onClick={async () => {
            setState("busy");
            const response = await fetch(`/api/case-files/${id}`, { method: "DELETE" });
            if (!response.ok) return setState("error");
            router.refresh();
          }}
        >
          Remove?
        </button>
        <button type="button" className="file-remove" onClick={() => setState("idle")}>
          Keep
        </button>
      </>
    );
  return (
    <button type="button" className="file-remove" onClick={() => setState("confirm")}>
      Remove
    </button>
  );
}