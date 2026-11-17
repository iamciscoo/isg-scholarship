import { requireUser } from "@/lib/auth/session";
import { Workspace } from "@/components/layout/workspace";
import { ProfileForm } from "@/features/applicants/profile-form";
export default async function Profile() {
  const { profile, user, role } = await requireUser();
  return (
    <Workspace role={role} email={user.email || ""} active="profile">
      <h1>Your personal details.</h1>
      <p>
        Keep your contact information current. Email changes are handled by ISG after identity verification.
      </p>
      <section className="workspace-panel">
        <ProfileForm profile={profile} />
      </section>
    </Workspace>
  );
}
