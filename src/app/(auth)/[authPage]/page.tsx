import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { AuthForm } from "@/features/auth/auth-form";
import { authConfigured } from "@/lib/supabase/config";
import { safeNext } from "@/lib/validation/auth";
import { requireUser } from "@/lib/auth/session";
const pages = {
  login: ["Welcome back.", "Sign in to continue your journey with ISG."],
  register: [
    "Your next chapter starts here.",
    "Create an applicant account. Verify your email before accessing your information.",
  ],
  "forgot-password": [
    "Let’s get you back in.",
    "We’ll send a recovery link if an account exists for your email.",
  ],
  "reset-password": ["Choose a new password.", "Use a strong password that you haven’t used elsewhere."],
} as const;
export async function generateMetadata({ params }: { params: Promise<{ authPage: string }> }) {
  const { authPage } = await params;
  return { title: authPage in pages ? pages[authPage as keyof typeof pages][0] : "Page not found" };
}
export default async function AuthPage({
  params,
  searchParams,
}: {
  params: Promise<{ authPage: string }>;
  searchParams: Promise<{ next?: string; account?: string; error?: string }>;
}) {
  const { authPage } = await params;
  if (!(authPage in pages)) notFound();
  const mode = authPage as keyof typeof pages;
  const query = await searchParams;
  if (mode === "reset-password") await requireUser();
  return (
    <>
      <h1>{pages[mode][0]}</h1>
      <p>{pages[mode][1]}</p>
      {query.account && (
        <p className="notice notice-error mb-5">Your account is unavailable. Please contact ISG.</p>
      )}
      {query.error && (
        <p className="notice notice-error mb-5">
          This link could not be verified. Please request a new link.
        </p>
      )}
      <AuthForm
        mode={mode}
        configured={
          authConfigured() &&
          Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY)
        }
        next={safeNext(query.next)}
        nonce={(await headers()).get("x-nonce") || undefined}
      />
    </>
  );
}
