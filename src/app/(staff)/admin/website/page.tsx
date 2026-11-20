import Image from "next/image";
import { requireStaff } from "@/lib/auth/session";
import { getHomepageImage, getMarketingImages } from "@/server/repositories/marketing-images";
import { ApprovedImagePicker } from "@/features/admin/approved-image-picker";
import { ActionForm } from "@/components/forms/action-form";
import { DeleteForm } from "@/components/forms/delete-form";
import { deleteMarketingImage, saveHomepageImage } from "@/features/admin/marketing-actions";
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
      <section className="workspace-card mt-6">
        <h2>Uploaded images</h2>
        {!images.length ? (
          <p>No uploaded images yet. Add one with “Upload a marketing image” above.</p>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Label</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {images.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Image src={item.path} alt="" width={96} height={64} />
                    </td>
                    <td>{item.label}</td>
                    <td>
                      <DeleteForm
                        action={deleteMarketingImage}
                        id={item.id}
                        label="Delete image"
                        confirm={`Delete “${item.label}”? It is removed from the picker and from storage.`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
