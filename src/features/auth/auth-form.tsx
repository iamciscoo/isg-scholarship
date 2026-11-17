"use client";
import Link from "next/link";
import { useActionState, useCallback, useState } from "react";
import { authenticate, resetPassword } from "./actions";
import { Turnstile } from "@/components/forms/turnstile";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import { useLocale } from "@/lib/i18n/provider";
export function AuthForm({
  mode,
  configured,
  next,
  nonce,
  captchaRequired,
}: {
  mode: "login" | "register" | "forgot-password" | "reset-password";
  configured: boolean;
  next?: string;
  nonce?: string;
  captchaRequired: boolean;
}) {
  const [state, action, pending] = useActionState(
    mode === "reset-password" ? resetPassword : authenticate,
    {},
  );
  const [token, setToken] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const {
    m: { ui: t },
  } = useLocale();
  const onToken = useCallback((v: string) => setToken(v), []);
  return (
    <form className="form-stack" action={action}>
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="next" value={next || ""} />
      <input type="hidden" name="captcha" value={token} />
      {!configured && (
        <div className="notice" role="status">
          {t.setup}
        </div>
      )}
      {mode !== "reset-password" && (
        <div className="field">
          <label htmlFor="auth-email">{t.email}</label>
          <input id="auth-email" name="email" type="email" autoComplete="email" required maxLength={254} />
        </div>
      )}
      {mode !== "forgot-password" && (
        <div className="field">
          <label htmlFor="auth-password">{t.password}</label>
          <div className="password-input">
            <input
              id="auth-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
              minLength={mode === "login" ? 1 : 12}
              maxLength={128}
            />
            <button
              type="button"
              aria-label={showPassword ? t.hidePassword : t.showPassword}
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
            </button>
          </div>
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
            <input name="adult" type="checkbox" required />
            {t.adult}
          </label>
          <label className="checkbox-field">
            <input name="terms" type="checkbox" required />
            <span>
              {t.acceptTerms} <Link href="/terms">Terms</Link> · <Link href="/privacy">Privacy</Link>
            </span>
          </label>
        </>
      )}
      {mode !== "reset-password" && captchaRequired && (
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
      <Button disabled={!configured || pending || (mode !== "reset-password" && captchaRequired && !token)}>
        {pending
          ? t.wait
          : {
              login: t.signIn,
              register: t.createAccount,
              "forgot-password": t.recover,
              "reset-password": t.updatePassword,
            }[mode]}
      </Button>
      <div className="auth-links">
        {mode === "login" ? (
          <>
            <Link href="/register">{t.createAccount}</Link>
            <Link href="/forgot-password">{t.forgot}</Link>
          </>
        ) : (
          <Link href="/login">{t.backSignIn}</Link>
        )}
      </div>
    </form>
  );
}
