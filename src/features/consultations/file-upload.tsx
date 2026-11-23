"use client";
import { useWorkspaceText } from "@/lib/i18n/workspace-text";

import { Text } from "@/lib/i18n/workspace-text";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { prepareImage } from "@/lib/images";
import { Button } from "@/components/ui/button";
import { LoadingDots } from "@/components/ui/loading-dots";
import { caseFileLimit, caseFileSizeError, type CaseUploadKind } from "@/lib/validation/case-file";

async function shrink(file: File) {
  if (!file.type.startsWith("image/") || file.size < 1_500_000) return file;
  try {
    const bitmap = await createImageBitmap(file);
    try {
      const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context) return file;
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.86));
      if (!blob || blob.size >= file.size) return file;
      return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
    } finally {
      bitmap.close();
    }
  } catch {
    return file;
  }
}

const labels: Record<CaseUploadKind, string> = {
  receipt: "Private payment receipt",
  document: "Document",
};

type UploadTarget = { kind: CaseUploadKind; category: string; application?: string; applicant?: string };

async function upload(file: File, target: UploadTarget) {
  const prepared = await shrink(await prepareImage(file));
  if (prepared.size > caseFileLimit) throw Error(caseFileSizeError);
  const data = new FormData();
  data.set("file", prepared);
  data.set("originalName", file.name);
  data.set("kind", target.kind);
  data.set("category", target.category);
  if (target.application) data.set("application", target.application);
  if (target.applicant) data.set("applicant", target.applicant);
  const response = await fetch("/api/case-files", { method: "POST", body: data });
  const result = (await response.json().catch(() => null)) as { id?: string; error?: string } | null;
  if (response.ok && result?.id) return;
  throw Error(
    result?.error || (response.status === 413 ? caseFileSizeError : "Upload failed. Please try again."),
  );
}

export function FileUpload({
  kind,
  category = "payment_receipt",
  application,
  applicant,
  multiple = false,
  label = labels[kind],
}: {
  kind: CaseUploadKind;
  category?: string;
  application?: string;
  applicant?: string;
  multiple?: boolean;
  label?: string;
}) {
  const translate = useWorkspaceText();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState("");
  const [retry, setRetry] = useState<File[]>([]);
  const ref = useRef<HTMLInputElement>(null);
  const canSelectMultiple = kind !== "receipt" && multiple;

  return (
    <form
      className="form-stack min-w-0"
      onSubmit={async (event) => {
        event.preventDefault();
        const selected = retry.length ? retry : Array.from(ref.current?.files || []);
        if (pending || !selected.length) return;
        setPending(true);
        setErrors([]);
        setSuccess("");
        const failed: File[] = [];
        const messages: string[] = [];
        for (const file of selected) {
          try {
            await upload(file, { kind, category, application, applicant });
          } catch (error) {
            const reason = error instanceof Error ? error.message : "Upload failed. Please try again.";
            const message =
              reason === "decode" || reason === "encode"
                ? "This photo could not be read. Try JPEG or PNG."
                : reason;
            failed.push(file);
            messages.push(canSelectMultiple ? `${file.name}: ${message}` : message);
          }
        }
        setPending(false);
        setRetry(failed);
        setErrors(messages);
        if (!failed.length && ref.current) ref.current.value = "";
        const uploaded = selected.length - failed.length;
        if (uploaded) {
          setSuccess(
            translate(uploaded === 1 ? "{count} file uploaded." : "{count} files uploaded.", {
              count: uploaded,
            }),
          );
          window.dispatchEvent(new Event("isg:notifications-read"));
          router.refresh();
        }
      }}
    >
      <label className="min-w-0 grid-cols-1">
        {<Text>{label}</Text>}
        <input
          className="w-full min-w-0 max-w-full overflow-hidden"
          ref={ref}
          name="file"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf,.heic,.heif,.pdf"
          multiple={canSelectMultiple}
          required
          disabled={pending}
          onChange={() => {
            setRetry([]);
            setErrors([]);
            setSuccess("");
          }}
        />
      </label>
      <p className="field-help">
        <Text>{"Images or PDFs · 4 MB each. Keep the original PDF."}</Text>
      </p>
      {kind === "receipt" && (
        <p className="field-help">
          <Text>{"Shared privately with ISG staff. Hide unrelated bank details."}</Text>
        </p>
      )}
      {errors.length > 0 && (
        <div role="alert" className="notice notice-error break-words">
          {errors.map((message, i) => (
            <div key={i}>{message}</div>
          ))}
        </div>
      )}
      {success && <p role="status">{success}</p>}
      <Button disabled={pending}>
        {pending ? (
          <>
            <Text>{"Uploading"}</Text>
            <LoadingDots />
          </>
        ) : retry.length ? (
          translate("Retry upload")
        ) : kind === "receipt" ? (
          translate("Upload receipt")
        ) : canSelectMultiple ? (
          translate("Upload files")
        ) : (
          translate("Upload document")
        )}
      </Button>
    </form>
  );
}
