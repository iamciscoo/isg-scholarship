export function authConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}
export function intakeConfigured() {
  return (
    authConfigured() &&
    Boolean(
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      process.env.TURNSTILE_SECRET_KEY &&
      process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    ) &&
    process.env.INTAKE_ENABLED === "true"
  );
}
export function contactConfigured() {
  return (
    authConfigured() &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) &&
    process.env.CONTACT_ENABLED !== "false"
  );
}
export function contactChallengeRequired() {
  return Boolean(process.env.TURNSTILE_SECRET_KEY || process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
}
