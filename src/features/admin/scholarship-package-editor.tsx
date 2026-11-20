import Image from "next/image";
import { ActionForm } from "@/components/forms/action-form";
import { type ScholarshipPackage, marketingImageSchema } from "@/lib/validation/opportunities";
import { getMarketingImages } from "@/server/repositories/marketing-images";
import { ApprovedImagePicker } from "./approved-image-picker";
import { PackagePriceField } from "./package-price-field";
import { saveScholarshipPackage } from "./scholarship-package-actions";

export async function ScholarshipPackageEditor({ value }: { value?: ScholarshipPackage }) {
  const images = await getMarketingImages();
  const fields = [
    { key: "name", label: "Scholarship name", value: value?.name, max: 200 },
    { key: "provider", label: "University or provider", value: value?.provider, max: 200 },
    { key: "destination", label: "Destination", value: value?.destination, max: 100 },
    { key: "studyLevel", label: "Study level", value: value?.study_level, max: 80 },
    { key: "field", label: "Academic field", value: value?.field, max: 160 },
  ];
  return (
    <ActionForm
      key={value?.id || "new-package"}
      action={saveScholarshipPackage}
      label={value ? "Save package" : "Create package"}
    >
      <input type="hidden" name="id" value={value?.id || ""} />
      <div className="form-grid">
        {fields.map((field) => (
          <label key={field.key}>
            {field.label}
            <input name={field.key} defaultValue={field.value} maxLength={field.max} required />
          </label>
        ))}
        <label>
          Application deadline (optional)
          <input name="deadline" type="date" defaultValue={value?.deadline || ""} />
        </label>
      </div>
      <label>
        Application requirements (optional)
        <textarea name="requirements" defaultValue={value?.requirements} maxLength={10000} />
      </label>
      <label>
        What ISG support is included? (optional)
        <textarea name="supportSummary" defaultValue={value?.support_summary} maxLength={3000} />
      </label>
      <PackagePriceField defaultValue={value?.package_fee_tzs ?? undefined} />
      <div className="form-grid">
        <label>
          University or provider fee (optional)
          <input
            name="providerFee"
            type="number"
            min={0}
            step="0.01"
            defaultValue={value?.provider_fee ?? ""}
          />
        </label>
        <label>
          Provider fee currency
          <select name="providerCurrency" defaultValue={value?.provider_currency || "TZS"}>
            {["TZS", "USD", "EUR", "GBP", "RUB"].map((currency) => (
              <option key={currency}>{currency}</option>
            ))}
          </select>
        </label>
      </div>
      {value?.private_image_id && (
        <div className="approved-image-preview">
          <Image
            src={`/api/scholarship-images/${value.private_image_id}`}
            alt="Current package image"
            fill
            unoptimized
          />
        </div>
      )}
      <label>
        {value?.private_image_id ? "Replace package image (optional)" : "Upload package image (optional)"}
        <input name="privateImage" type="file" accept="image/jpeg,image/png,image/webp" />
        <small>JPEG, PNG or WebP up to 3 MB. Shared with the applicant when you send the package.</small>
      </label>
      <details className="package-gallery">
        <summary>{value?.private_image_id ? "Switch to a gallery image" : "Choose a gallery image"}</summary>
        {value?.private_image_id && (
          <label className="checkbox-field">
            <input type="checkbox" name="useGallery" /> Use the selected gallery image
          </label>
        )}
        <ApprovedImagePicker
          image={marketingImageSchema.safeParse(value?.image).data}
          images={images}
          showUpload={false}
        />
      </details>
      <label className="checkbox-field">
        <input type="checkbox" name="active" defaultChecked={value?.active ?? true} />
        Available to share with applicants
      </label>
    </ActionForm>
  );
}
