import type { Metadata } from "next";
export const metadata: Metadata = { title: "My ISG", robots: { index: false, follow: false } };
export default function ApplicantLayout({ children }: { children: React.ReactNode }) {
  return children;
}
