import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth/session";
import { WorkspaceLayout } from "@/components/layout/workspace";
export const metadata: Metadata = { title: "ISG staff workspace", robots: { index: false, follow: false } };
export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const { user, role } = await requireStaff();
  return (
    <WorkspaceLayout role={role} email={user.email || ""}>
      {children}
    </WorkspaceLayout>
  );
}
