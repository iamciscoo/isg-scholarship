"use client";
import { useWorkspaceText } from "@/lib/i18n/workspace-text";

import { Text } from "@/lib/i18n/workspace-text";

import Image from "next/image";
import { useActionState, useEffect, useRef, useState } from "react";
import { Camera, Upload, UserRound } from "lucide-react";
import { uploadAvatar } from "./avatar-actions";
import { prepareImage } from "@/lib/images";
import { Button } from "@/components/ui/button";
import { LoadingDots } from "@/components/ui/loading-dots";
import { useDirtyForm } from "@/components/forms/unsaved-changes";
export function AvatarForm({ version }: { version: string | null }) {
  const translate = useWorkspaceText();
  const [state, action, pending] = useActionState(uploadAvatar, {});
  const [selection, setSelection] = useState<{ url: string; name: string } | null>(null);
  const [error, setError] = useState("");
  const [preparing, setPreparing] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const objectUrl = useRef<string | null>(null);
  useEffect(
    () => () => {
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    },
    [],
  );
  const photo = selection?.url || (version ? `/api/profile/avatar?v=${encodeURIComponent(version)}` : null);
  const busy = pending || preparing;
  const { formRef, dirty } = useDirtyForm({
    state,
    pending: busy,
    label: "Save photo",
    onCancel: () => {
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = null;
      setSelection(null);
      setError("");
    },
  });
  return (
    <form ref={formRef} action={action} className="form-stack avatar-form">
      <div className="avatar-editor">
        <div className={`avatar-preview${busy ? " is-busy" : ""}`}>
          {photo ? (
            selection ? (
              // Blob preview: next/image is unnecessary for an object URL shown once.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt={translate("Profile photo preview")} width={104} height={104} />
            ) : (
              <Image
                unoptimized
                src={photo}
                width={104}
                height={104}
                alt={translate("Profile photo preview")}
              />
            )
          ) : (
            <UserRound size={38} strokeWidth={1.4} />
          )}
          {busy && (
            <span className="avatar-busy" role="status" aria-label={translate("Uploading photo")}>
              <LoadingDots />
            </span>
          )}
        </div>
        <div className="avatar-editor-copy">
          <h2>
            <Text>{"Your profile photo"}</Text>
          </h2>
          <p>
            <Text>{"Choose a clear photo of yourself. JPEG, PNG, WebP or iPhone HEIC, up to 8 MB."}</Text>
          </p>
          <input
            ref={input}
            className="sr-only"
            tabIndex={-1}
            aria-label={translate("Choose profile photo")}
            type="file"
            name="avatar"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
            onChange={async (event) => {
              const picked = event.target.files?.[0];
              setError("");
              if (objectUrl.current) {
                URL.revokeObjectURL(objectUrl.current);
                objectUrl.current = null;
              }
              setSelection(null);
              if (!picked) return;
              setPreparing(true);
              try {
                const file = await prepareImage(picked);
                if (file.size > 8388608 || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
                  event.target.value = "";
                  setError("Choose a JPEG, PNG or WebP image under 8 MB.");
                  return;
                }
                const transfer = new DataTransfer();
                transfer.items.add(file);
                event.target.files = transfer.files;
                objectUrl.current = URL.createObjectURL(file);
                setSelection({ url: objectUrl.current, name: file.name });
              } catch {
                event.target.value = "";
                setError("This photo could not be read. Try a JPEG or PNG.");
              } finally {
                setPreparing(false);
                formRef.current?.dispatchEvent(new Event("change", { bubbles: true }));
              }
            }}
          />
          <div className="avatar-buttons">
            <Button type="button" variant="outline" onClick={() => input.current?.click()} disabled={busy}>
              <Camera size={17} />
              {version ? translate("Change photo") : translate("Choose photo")}
            </Button>
            <Button disabled={!selection || busy} className={dirty ? "save-inline-hidden" : undefined}>
              <Upload size={16} />
              {pending ? (
                <>
                  <Text>{"Saving"}</Text>
                  <LoadingDots />
                </>
              ) : (
                translate("Save photo")
              )}
            </Button>
          </div>
          {selection && <span className="avatar-file-name">{selection.name}</span>}
        </div>
      </div>
      {(error || state.error) && (
        <p className="field-error" role="alert">
          {translate(error || state.error || "")}
        </p>
      )}
      {state.message && (
        <p className="form-message" role="status">
          {translate(state.message)}
        </p>
      )}
    </form>
  );
}
