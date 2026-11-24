import { Text } from "@/lib/i18n/workspace-text";
import { requireUser } from "@/lib/auth/session";
import { Workspace } from "@/components/layout/workspace";
import { ProfileForm } from "@/features/applicants/profile-form";
import { AvatarForm } from "@/features/applicants/avatar-form";
import { PasswordForm } from "@/features/applicants/password-form";
export default async function Profile() {
  const { profile, user, role } = await requireUser();
  const providers: string[] =
    user.app_metadata?.providers ??
    (user.app_metadata?.provider ? [String(user.app_metadata.provider)] : []);
  const hasPassword = Boolean(profile.password_set_at) || providers.includes("email");
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
      <section className="workspace-panel">
        <PasswordForm hasPassword={hasPassword} />
      </section>
    </Workspace>
  );
}
