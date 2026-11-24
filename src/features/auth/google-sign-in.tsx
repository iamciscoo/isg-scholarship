"use client";
import { signInWithGoogle } from "./actions";

function GoogleMark() {
  return (
    <svg viewBox="0 0 18 18" width="17" height="17" aria-hidden focusable="false">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92a8.78 8.78 0 0 0 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18a8.6 8.6 0 0 0 5.96-2.18l-2.92-2.26A5.4 5.4 0 0 1 9 14.18a5.4 5.4 0 0 1-5.07-3.72H.94v2.33A9 9 0 0 0 9 18Z"
      />
      <path fill="#FBBC05" d="M3.93 10.46a5.4 5.4 0 0 1 0-3.42V4.71H.94a9 9 0 0 0 0 8.08l2.99-2.33Z" />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .94 4.71l2.99 2.33A5.4 5.4 0 0 1 9 3.58Z"
      />
    </svg>
  );
}

export function GoogleSignIn({ next, configured }: { next?: string; configured: boolean }) {
  return (
    <form action={signInWithGoogle} className="google-signin">
      <input type="hidden" name="next" value={next || ""} />
      <button className="button button-outline" type="submit" disabled={!configured}>
        <GoogleMark />
        Continue with Google
      </button>
    </form>
  );
}