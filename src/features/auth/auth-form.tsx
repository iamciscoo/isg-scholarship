"use client";
import Link from "next/link";
import { useActionState, useCallback, useState } from "react";
import { authenticate, resetPassword } from "./actions";
import { Turnstile } from "@/components/forms/turnstile";
import { Button } from "@/components/ui/button";
export function AuthForm({
  mode,
  configured,
  next,
  nonce,
}: {
  mode: "login" | "register" | "forgot-password" | "reset-password";
  configured: boolean;
  next?: string;
  nonce?: string;
}) {
  const [state, action, pending] = useActionState(
    mode === "reset-password" ? resetPassword : authenticate,
    {},
  );
  const [token, setToken] = useState("");
  const onToken = useCallback((v: string) => setToken(v), []);
  return (
    <form className="form-stack" action={action}>
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="next" value={next || "/dashboard"} />
      <input type="hidden" name="captcha" value={token} />
      {!configured && (
        <div className="notice" role="status">
          Account services are awaiting setup. You can browse ISG and contact the team in the meantime.
        </div>
      )}
      {mode !== "reset-password" && (
        <div className="field">
          <label htmlFor="auth-email">Email address</label>
          <input id="auth-email" name="email" type="email" autoComplete="email" required maxLength={254} />
        </div>
      )}
      {mode !== "forgot-password" && (
        <div className="field">
          <label htmlFor="auth-password">{mode === "reset-password" ? "New password" : "Password"}</label>
          <input
            id="auth-password"
            name="password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
            minLength={mode === "login" ? 1 : 12}
            maxLength={128}
          />
          {mode !== "login" && (
            <span className="field-help">
              At least 12 characters, including uppercase, lowercase and a number.
            </span>
          )}
        </div>
      )}
      {mode === "register" && (
        <>
          <label className="checkbox-field">
            <input name="adult" type="checkbox" required />I confirm that I am 18 years of age or older.
          </label>
          <label className="checkbox-field">
            <input name="terms" type="checkbox" required />
            <span>
              I accept the <Link href="/terms">service terms</Link> and acknowledge the{" "}
              <Link href="/privacy">privacy information</Link>.
            </span>
          </label>
        </>
      )}
      {mode !== "reset-password" && (
        <Turnstile action="auth" nonce={nonce} onToken={onToken} resetKey={pending ? 1 : 0} />
      )}
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
      <Button disabled={!configured || pending || (mode !== "reset-password" && !token)}>
        {pending
          ? "Please wait…"
          : {
              login: "Sign in",
              register: "Create account",
              "forgot-password": "Send recovery link",
              "reset-password": "Update password",
            }[mode]}
      </Button>
      <div className="auth-links">
        {mode === "login" ? (
          <>
            <Link href="/register">Create an account</Link>
            <Link href="/forgot-password">Forgot password?</Link>
          </>
        ) : (
          <Link href="/login">Back to sign in</Link>
        )}
      </div>
    </form>
  );
}
