import { StaffCase } from "@/features/consultations/staff-case";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <StaffCase id={(await params).id} admin={false} />;
}
