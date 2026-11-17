"use client";
import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { saveProfile } from "./actions";
type Profile = {
  first_name: string;
  last_name: string;
  phone: string;
  nationality: string;
  residence: string;
};
export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, action, pending] = useActionState(saveProfile, {});
  return (
    <form action={action} className="form-stack">
      <div className="form-grid">
        {(
          [
            { name: "first_name", label: "First name", auto: "given-name" },
            { name: "last_name", label: "Last name", auto: "family-name" },
            { name: "phone", label: "Phone / WhatsApp (optional)", auto: "tel" },
            { name: "nationality", label: "Nationality (optional)", auto: "off" },
            { name: "residence", label: "Country of residence (optional)", auto: "country-name" },
          ] as const
        ).map((field) => (
          <div className="field" key={field.name}>
            <label htmlFor={field.name}>{field.label}</label>
            <input
              id={field.name}
              name={field.name}
              autoComplete={field.auto}
              defaultValue={profile[field.name]}
              required={field.name.endsWith("name")}
              maxLength={field.name === "phone" ? 25 : 80}
            />
          </div>
        ))}
      </div>
      <label className="checkbox-field">
        <input type="checkbox" name="terms" required />
        <span>
          I accept the <Link href="/terms">service terms</Link> and acknowledge the{" "}
          <Link href="/privacy">privacy information</Link> for my account.
        </span>
      </label>
      {state.error && (
        <p role="alert" className="notice notice-error">
          {state.error}
        </p>
      )}
      {state.message && (
        <p role="status" className="form-message">
          {state.message}
        </p>
      )}
      <div>
        <Button disabled={pending}>{pending ? "Saving…" : "Save profile"}</Button>
      </div>
    </form>
  );
}
