"use client";
import Image from "next/image";
import { useActionState, useEffect, useRef, useState } from "react";
import { Camera, Upload, UserRound } from "lucide-react";
import { uploadAvatar } from "./avatar-actions";
import { prepareImage } from "@/lib/images";
import { Button } from "@/components/ui/button";
import { LoadingDots } from "@/components/ui/loading-dots";
export function AvatarForm({ version }: { version: string | null }) {
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
  return (
    <form action={action} className="form-stack avatar-form">
      <div className="avatar-editor">
        <div className={`avatar-preview${busy ? " is-busy" : ""}`}>
          {photo ? (
            <Image unoptimized src={photo} width={104} height={104} alt="Profile photo preview" />
          ) : (
            <UserRound size={38} strokeWidth={1.4} />
          )}
          {busy && (
            <span className="avatar-busy" role="status" aria-label="Uploading photo">
              <LoadingDots />
            </span>
          )}
        </div>
        <div className="avatar-editor-copy">
          <h2>Your profile photo</h2>
          <p>Choose a clear photo of yourself. JPEG, PNG, WebP or iPhone HEIC, up to 5 MB.</p>
          <input
            ref={input}
            className="sr-only"
            tabIndex={-1}
            aria-label="Choose profile photo"
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
                if (file.size > 5242880 || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
                  event.target.value = "";
                  setError("Choose a JPEG, PNG or WebP image under 5 MB.");
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
              }
            }}
          />
          <div className="avatar-buttons">
            <Button type="button" variant="outline" onClick={() => input.current?.click()} disabled={busy}>
              <Camera size={17} />
              {version ? "Change photo" : "Choose photo"}
            </Button>
            <Button disabled={!selection || busy}>
              <Upload size={16} />
              {pending ? (
                <>
                  Saving
                  <LoadingDots />
                </>
              ) : (
                "Save photo"
              )}
            </Button>
          </div>
          {selection && <span className="avatar-file-name">{selection.name}</span>}
        </div>
      </div>
      {(error || state.error) && (
        <p className="notice notice-error" role="alert">
          {error || state.error}
        </p>
      )}
      {state.message && (
        <p className="form-message" role="status">
          {state.message}
        </p>
      )}
    </form>
  );
}
