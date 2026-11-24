"use client";
import Link from "next/link";
import { useActionState, useCallback, useState } from "react";
import { authenticate, resetPassword, type AuthState } from "./actions";
import { Turnstile } from "@/components/forms/turnstile";
import { Button } from "@/components/ui/button";
import { Check, Circle, Eye, EyeOff } from "lucide-react";
import { useLocale } from "@/lib/i18n/provider";
import { useWorkspaceText } from "@/lib/i18n/workspace-text";
import { passwordRequirements } from "@/lib/validation/auth";
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
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [dismissed, dismiss] = useState<AuthState>();
  const translate = useWorkspaceText();
  const {
    m: { ui: t },
  } = useLocale();
  const onToken = useCallback((v: string) => setToken(v), []);
  const visibleError = pending || dismissed === state ? undefined : state.error;
  const newPassword = mode === "register" || mode === "reset-password";
  const mismatch = confirmation !== "" && confirmation !== password;
  const messageFor = (field: AuthState["field"]) => (state.field === field ? visibleError : undefined);
  const clearError = (field: AuthState["field"]) => {
    if (!state.field || state.field === field || (field === "email" && mode === "login")) dismiss(state);
  };
  const confirmationError =
    messageFor("confirmPassword") || (mismatch ? "The two passwords must match." : undefined);
  return (
    <form className="form-stack" action={action} noValidate onReset={(event) => event.preventDefault()}>
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
          <input
            id="auth-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            readOnly={pending}
            aria-invalid={!!messageFor("email")}
            aria-describedby={messageFor("email") ? "auth-email-error" : undefined}
            onChange={() => clearError("email")}
          />
          <AuthError id="auth-email-error" message={messageFor("email")} />
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
              readOnly={pending}
              value={password}
              aria-invalid={!!messageFor("password")}
              aria-describedby={
                [
                  newPassword ? "auth-password-requirements" : "",
                  messageFor("password") ? "auth-password-error" : "",
                ]
                  .filter(Boolean)
                  .join(" ") || undefined
              }
              onChange={(event) => {
                setPassword(event.target.value);
                if (state.field === "confirmPassword") dismiss(state);
                else clearError("password");
              }}
            />
            <button
              type="button"
              aria-label={showPassword ? t.hidePassword : t.showPassword}
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
            </button>
          </div>
          <AuthError id="auth-password-error" message={messageFor("password")} />
          {newPassword && (
            <ul id="auth-password-requirements" className="password-requirements">
              {passwordRequirements.map((rule) => {
                const met = rule.meets(password);
                const Icon = met ? Check : Circle;
                return (
                  <li key={rule.message} data-met={met}>
                    <Icon size={13} aria-hidden />
                    {translate(rule.message)}
                    <span className="sr-only"> {translate(met ? "Met" : "Required")}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
      {mode === "register" && (
        <>
          <div className="field">
            <label htmlFor="auth-password-confirm">{t.confirmPassword}</label>
            <input
              id="auth-password-confirm"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
              readOnly={pending}
              value={confirmation}
              aria-invalid={!!confirmationError}
              aria-describedby={confirmationError ? "auth-confirm-error" : undefined}
              onChange={(event) => {
                setConfirmation(event.target.value);
                clearError("confirmPassword");
              }}
            />
            <AuthError id="auth-confirm-error" message={confirmationError} />
          </div>
          <div>
            <label className="checkbox-field">
              <input
                name="adult"
                type="checkbox"
                required
                onChange={() => clearError("adult")}
                aria-invalid={!!messageFor("adult")}
                aria-describedby={messageFor("adult") ? "auth-adult-error" : undefined}
              />
              {t.adult}
            </label>
            <AuthError id="auth-adult-error" message={messageFor("adult")} />
          </div>
          <div>
            <label className="checkbox-field">
              <input
                name="terms"
                type="checkbox"
                required
                onChange={() => clearError("terms")}
                aria-invalid={!!messageFor("terms")}
                aria-describedby={messageFor("terms") ? "auth-terms-error" : undefined}
              />
              <span>
                {t.acceptTerms} <Link href="/terms">Terms</Link> · <Link href="/privacy">Privacy</Link>
              </span>
            </label>
            <AuthError id="auth-terms-error" message={messageFor("terms")} />
          </div>
        </>
      )}
      {mode !== "reset-password" && captchaRequired && (
        <Turnstile action="auth" nonce={nonce} onToken={onToken} resetKey={pending ? 1 : 0} />
      )}
      <AuthError message={messageFor(undefined)} />
      {state.message && (
        <p className="form-message" role="status">
          {translate(state.message)}
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

function AuthError({ id, message }: { id?: string; message?: string }) {
  const t = useWorkspaceText();
  return message ? (
    <p id={id} className="field-error" role="alert">
      {t(message)}
    </p>
  ) : null;
}
