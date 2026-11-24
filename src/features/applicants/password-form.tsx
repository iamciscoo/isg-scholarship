"use client";
import { useActionState, useState } from "react";
import { Check, Circle, Eye, EyeOff } from "lucide-react";
import { setAccountPassword, type PasswordState } from "./actions";
import { passwordRequirements } from "@/lib/validation/auth";
import { Button } from "@/components/ui/button";
import { LoadingDots } from "@/components/ui/loading-dots";

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [state, action, pending] = useActionState<PasswordState, FormData>(setAccountPassword, {});
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [visible, setVisible] = useState(false);
  const mismatch = confirmation !== "" && confirmation !== password;
  const blocked = pending || passwordRequirements.some((rule) => !rule.meets(password)) || mismatch;
  return (
    <form action={action} className="form-stack password-panel">
      <h2>{hasPassword ? "Change your password" : "Set a password"}</h2>
      <p>
        {hasPassword
          ? "Choose a new password. You stay signed in on this device."
          : "You sign in with Google today. Add a password so you can also sign in with your email address."}
      </p>
      <div className="field">
        <label htmlFor="profile-password">New password</label>
        <div className="password-input">
          <input
            id="profile-password"
            name="password"
            type={visible ? "text" : "password"}
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            required
            readOnly={pending}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <button
            type="button"
            aria-label={visible ? "Hide password" : "Show password"}
            onClick={() => setVisible(!visible)}
          >
            {visible ? <EyeOff size={19} /> : <Eye size={19} />}
          </button>
        </div>
        <ul className="password-requirements">
          {passwordRequirements.map((rule) => {
            const met = rule.meets(password);
            const Icon = met ? Check : Circle;
            return (
              <li key={rule.message} data-met={met}>
                <Icon size={13} aria-hidden />
                {rule.message}
              </li>
            );
          })}
        </ul>
      </div>
      <div className="field">
        <label htmlFor="profile-password-confirm">Confirm new password</label>
        <input
          id="profile-password-confirm"
          name="confirmPassword"
          type={visible ? "text" : "password"}
          autoComplete="new-password"
          minLength={12}
          maxLength={128}
          required
          readOnly={pending}
          value={confirmation}
          aria-invalid={mismatch}
          onChange={(event) => setConfirmation(event.target.value)}
        />
        {mismatch && (
          <p className="field-error" role="alert">
            The two passwords must match.
          </p>
        )}
      </div>
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
      <Button disabled={blocked}>
        {pending ? (
          <>
            Saving
            <LoadingDots />
          </>
        ) : hasPassword ? (
          "Save new password"
        ) : (
          "Set password"
        )}
      </Button>
    </form>
  );
}