"use client";
import { useActionState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { enrollMfa, verifyMfa } from "./mfa-actions";
export function MfaForm({ factorId }: { factorId?: string }) {
  const [setup, enroll, enrolling] = useActionState(enrollMfa, {});
  const [state, verify, pending] = useActionState(verifyMfa, {});
  const factor = factorId || setup.factorId;
  return (
    <div className="form-stack">
      {!factor && (
        <form action={enroll}>
          <p className="mb-5 text-sm">Set up an authenticator app to protect staff access.</p>
          <Button disabled={enrolling}>{enrolling ? "Preparing…" : "Set up authenticator"}</Button>
        </form>
      )}
      {setup.qrCode && (
        <div>
          <p className="field-help mb-4">Scan this QR code with your authenticator app. Keep it private.</p>
          {/* Authenticator QR is returned by the authenticated Supabase MFA endpoint. */}
          <Image
            unoptimized
            src={setup.qrCode}
            width={240}
            height={240}
            alt="Scan to enroll your ISG staff authenticator"
          />
        </div>
      )}
      {factor && (
        <form action={verify} className="form-stack">
          <input type="hidden" name="factorId" value={factor} />
          <div className="field">
            <label htmlFor="mfa-code">Authenticator code</label>
            <input
              id="mfa-code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              minLength={6}
              maxLength={6}
              required
            />
          </div>
          <Button disabled={pending}>{pending ? "Verifying…" : "Verify and continue"}</Button>
        </form>
      )}
      {(state.error || setup.error) && (
        <p role="alert" className="notice notice-error">
          {state.error || setup.error}
        </p>
      )}
    </div>
  );
}
