"use client";
import Link from "next/link";
import { ActionForm } from "@/components/forms/action-form";
import { Text, useWorkspaceText } from "@/lib/i18n/workspace-text";
import { saveProfile } from "./actions";
import { CountrySelect } from "./country-select";
type Profile = {
  first_name: string;
  last_name: string;
  phone: string;
  nationality: string;
  residence: string;
};
export function ProfileForm({ profile, email }: { profile: Profile; email: string }) {
  const t = useWorkspaceText();
  return (
    <ActionForm action={saveProfile} label="Save profile">
      <div className="form-grid">
        {(
          [
            { name: "first_name", label: "First name", auto: "given-name", value: profile.first_name },
            { name: "last_name", label: "Last name", auto: "family-name", value: profile.last_name },
            { name: "email", label: "Email address", auto: "email", value: email },
            { name: "phone", label: "Phone / WhatsApp (optional)", auto: "tel", value: profile.phone },
            { name: "residence", label: "Country of residence (optional)", auto: "country-name", value: profile.residence },
            { name: "nationality", label: "Nationality (optional)", auto: "off", value: profile.nationality },
          ] as const
        ).map((field) => (
          <div className="field" key={field.name}>
            <label htmlFor={field.name}>{t(field.label)}</label>
            {field.name === "email" ? (
              <input id={field.name} defaultValue={field.value} disabled autoComplete="email" />
            ) : field.name === "residence" || field.name === "nationality" ? (
              <CountrySelect
                id={field.name}
                name={field.name}
                defaultValue={field.value}
                mode={field.name === "nationality" ? "demonym" : "country"}
              />
            ) : (
              <input
                id={field.name}
                name={field.name}
                autoComplete={field.auto}
                defaultValue={field.value}
                required={field.name.endsWith("name")}
                maxLength={field.name === "phone" ? 25 : 80}
              />
            )}
          </div>
        ))}
      </div>
      <label className="checkbox-field">
        <input type="checkbox" name="terms" required />
        <span>
          <Text>I accept the</Text>{" "}
          <Link href="/terms">
            <Text>service terms</Text>
          </Link>{" "}
          <Text>and acknowledge the</Text>{" "}
          <Link href="/privacy">
            <Text>privacy information</Text>
          </Link>{" "}
          <Text>for my account.</Text>
        </span>
      </label>
    </ActionForm>
  );
}
