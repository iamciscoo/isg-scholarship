"use client";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { LoadingDots } from "@/components/ui/loading-dots";

// Large phone photos exceed gateway body limits, so shrink them in the browser before upload.
async function shrink(file: File) {
  if (!file.type.startsWith("image/") || file.size < 1_500_000) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}
export function FileUpload({
  kind,
  category = "payment_receipt",
  application,
}: {
  kind: "receipt" | "document";
  category?: string;
  application?: string;
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
          data.set("file", await shrink(file));
          data.set("kind", kind);
          data.set("category", category);
          if (application) data.set("application", application);
          const r = await fetch("/api/case-files", { method: "POST", body: data });
          // Gateway errors (413 and friends) are not JSON, so read text and parse defensively.
          const text = await r.text();
          let result: { error?: string } = {};
          try {
            result = JSON.parse(text);
          } catch {
            /* keep the generic message below */
          }
          if (!r.ok)
            throw Error(
              result.error ||
                (r.status === 413
                  ? "That file is too large. Choose a smaller photo."
                  : "Upload failed. Please try again."),
            );
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
      <p>JPEG, PNG, WebP or PDF, up to 8 MB.</p>
      {kind === "receipt" && (
        <p className="field-help">
          Your receipt is sent automatically to ISG’s private staff WhatsApp group for verification.
        </p>
      )}
      {message && (
        <p role="alert" className="notice notice-error">
          {message}
        </p>
      )}
      <Button disabled={pending}>
        {pending ? (
          <>
            Checking and uploading
            <LoadingDots />
          </>
        ) : kind === "receipt" ? (
          "Upload receipt"
        ) : (
          "Upload document"
        )}
      </Button>
    </form>
  );
}
