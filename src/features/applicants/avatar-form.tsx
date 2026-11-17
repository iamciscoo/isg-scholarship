"use client";
import Image from "next/image";
import { useActionState } from "react";
import { uploadAvatar } from "./avatar-actions";
import { Button } from "@/components/ui/button";
export function AvatarForm({ version }: { version: string | null }) {
  const [state, action, pending] = useActionState(uploadAvatar, {});
  return (
    <form action={action} className="form-stack avatar-form">
      <h2>Profile photo</h2>
      {version && (
        <Image
          src={`/api/profile/avatar?v=${encodeURIComponent(version)}`}
          alt="Your profile photo"
          width={80}
          height={80}
          unoptimized
          className="profile-photo"
        />
      )}
      <label>
        Choose a photo
        <input type="file" name="avatar" accept="image/jpeg,image/png,image/webp" required />
      </label>
      <p>JPEG, PNG or WebP, up to 2 MB. Your photo stays private to your account.</p>
      {state.error && (
        <p className="notice notice-error" role="alert">
          {state.error}
        </p>
      )}
      {state.message && (
        <p className="form-message" role="status">
          {state.message}
        </p>
      )}
      <Button disabled={pending}>{pending ? "Uploading…" : "Save profile photo"}</Button>
    </form>
  );
}
