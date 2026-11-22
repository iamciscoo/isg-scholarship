import { StaffApplicationEditor } from "@/features/applicants/staff-application-editor";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <StaffApplicationEditor id={(await params).id} admin={false} />;
}
