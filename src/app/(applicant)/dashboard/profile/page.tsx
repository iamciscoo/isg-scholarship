import { Text } from "@/lib/i18n/workspace-text";
import { requireUser } from "@/lib/auth/session";
import { Workspace } from "@/components/layout/workspace";
import { ProfileForm } from "@/features/applicants/profile-form";
import { AvatarForm } from "@/features/applicants/avatar-form";
export default async function Profile() {
  const { profile, user, role } = await requireUser();
  return (
    <Workspace role={role} email={user.email || ""} active="profile">
      <h1>
        <Text>{"Your personal details."}</Text>
      </h1>
      <p>
        <Text>
          {
            "Keep your contact information current. Email changes are handled by ISG after identity verification."
          }
        </Text>
      </p>
      <section className="workspace-panel">
        <AvatarForm version={profile.avatar_path ? profile.updated_at : null} />
      </section>
      <section className="workspace-panel">
        <ProfileForm profile={profile} />
      </section>
    </Workspace>
  );
}
