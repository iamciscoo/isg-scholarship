import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { WorkspaceLayout } from "@/components/layout/workspace";
export const metadata: Metadata = { title: "My ISG", robots: { index: false, follow: false } };
export default async function ApplicantLayout({ children }: { children: React.ReactNode }) {
  const { user, role } = await requireUser();
  return (
    <WorkspaceLayout role={role} email={user.email || ""}>
      {children}
    </WorkspaceLayout>
  );
}
