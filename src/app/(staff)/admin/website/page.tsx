import { requireStaff } from "@/lib/auth/session";
import { getHomepageImage, getMarketingImages } from "@/server/repositories/marketing-images";
import { ApprovedImagePicker } from "@/features/admin/approved-image-picker";
import { ActionForm } from "@/components/forms/action-form";
import { saveHomepageImage } from "@/features/admin/marketing-actions";
export default async function WebsiteImages() {
  await requireStaff(true);
  const [image, images] = await Promise.all([getHomepageImage(), getMarketingImages()]);
  return (
    <>
      <h1>Website images.</h1>
      <p>Choose the photograph on the homepage. Upload only images ISG has permission to publish.</p>
      <section className="workspace-card mt-6">
        <h2>Homepage hero</h2>
        <ActionForm action={saveHomepageImage} label="Save homepage image">
          <ApprovedImagePicker image={image} images={images} />
        </ActionForm>
      </section>
    </>
  );
}
