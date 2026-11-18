"use client";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
export function FileUpload({
  kind,
  category = "payment_receipt",
}: {
  kind: "receipt" | "document";
  category?: string;
}) {
  const [pending, setPending] = useState(false),
    [message, setMessage] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  return (
    <form
      className="form-stack"
      onSubmit={async (e) => {
        e.preventDefault();
        const file = ref.current?.files?.[0];
        if (!file) return;
        if (file.size > 8 * 1024 * 1024) {
          setMessage("Choose a file under 8 MB.");
          return;
        }
        setPending(true);
        setMessage("");
        try {
          const data = new FormData();
          data.set("file", file);
          data.set("kind", kind);
          data.set("category", category);
          const r = await fetch("/api/case-files", { method: "POST", body: data });
          const result = await r.json();
          if (!r.ok) throw Error(result.error || "Upload failed.");
          window.location.reload();
        } catch (err) {
          setMessage(err instanceof Error ? err.message : "Upload failed. Please try again.");
        } finally {
          setPending(false);
        }
      }}
    >
      <label>
        {kind === "receipt" ? "Private payment receipt" : "Requested document"}
        <input
          ref={ref}
          name="file"
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          required
          disabled={pending}
        />
      </label>
      <p>
        JPEG, PNG, WebP or PDF, up to 8 MB. PDF uploads require the secure scanning service. Never upload
        someone else’s documents.
      </p>
      {message && (
        <p role="alert" className="notice notice-error">
          {message}
        </p>
      )}
      <Button disabled={pending}>{pending ? "Checking and uploading…" : "Upload privately"}</Button>
    </form>
  );
}
