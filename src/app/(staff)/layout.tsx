import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth/session";
import { WorkspaceLayout } from "@/components/layout/workspace";
export const metadata: Metadata = { title: "ISG staff workspace", robots: { index: false, follow: false } };
export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const { user, role, profile } = await requireStaff();
  return (
    <WorkspaceLayout
      role={role}
      email={user.email || ""}
      account={{
        name: `${profile.first_name} ${profile.last_name}`.trim() || user.email || "ISG account",
        avatar: profile.avatar_path
          ? `/api/profile/avatar?v=${encodeURIComponent(profile.updated_at)}`
          : null,
      }}
    >
      {children}
    </WorkspaceLayout>
  );
}
