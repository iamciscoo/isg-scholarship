import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
export const metadata: Metadata = { robots: { index: false, follow: false } };
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="main" className="auth-shell">
      <div className="auth-card">
        <Link href="/" className="auth-brand">
          <Image src="/brand/logo.svg" width={280} height={72} alt="ISG home" />
        </Link>
        {children}
      </div>
    </main>
  );
}
