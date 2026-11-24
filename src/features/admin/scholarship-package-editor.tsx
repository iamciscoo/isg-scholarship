import { getWorkspaceText } from "@/lib/i18n/server";

import { Text } from "@/lib/i18n/workspace-text";
import Image from "next/image";
import { ActionForm } from "@/components/forms/action-form";
import { type ScholarshipPackage, marketingImageSchema } from "@/lib/validation/opportunities";
import { getEditorMarketingImages } from "@/server/repositories/marketing-images";
import { ApprovedImagePicker } from "./approved-image-picker";
import { PackagePriceField } from "./package-price-field";
import { saveScholarshipPackage } from "./scholarship-package-actions";

export async function ScholarshipPackageEditor({ value }: { value?: ScholarshipPackage }) {
  const [translate, images] = await Promise.all([getWorkspaceText(), getEditorMarketingImages()]);
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
            {<Text>{field.label}</Text>}
            <input name={field.key} defaultValue={field.value} maxLength={field.max} required />
          </label>
        ))}
        <label>
          <Text>{"Application deadline (optional)"}</Text>
          <input name="deadline" type="date" defaultValue={value?.deadline || ""} />
        </label>
      </div>
      <label>
        <Text>{"Application requirements (optional)"}</Text>
        <textarea name="requirements" defaultValue={value?.requirements} maxLength={10000} />
      </label>
      <label>
        <Text>{"What ISG support is included? (optional)"}</Text>
        <textarea name="supportSummary" defaultValue={value?.support_summary} maxLength={3000} />
      </label>
      <PackagePriceField defaultValue={value?.package_fee_tzs ?? undefined} />
      <div className="form-grid">
        <label>
          <Text>{"University or provider fee (optional)"}</Text>
          <input
            name="providerFee"
            type="number"
            min={0}
            step="0.01"
            defaultValue={value?.provider_fee ?? ""}
          />
        </label>
        <label>
          <Text>{"Provider fee currency"}</Text>
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
            alt={translate("Current package image")}
            fill
            unoptimized
          />
        </div>
      )}
      <label>
        {value?.private_image_id
          ? translate("Replace package image (optional)")
          : translate("Upload package image (optional)")}
        <input name="privateImage" type="file" accept="image/jpeg,image/png,image/webp" />
        <small>
          <Text>{"JPEG, PNG or WebP up to 5 MB. Shared with the applicant when you send the package."}</Text>
        </small>
      </label>
      <details className="package-gallery">
        <summary>
          {value?.private_image_id
            ? translate("Switch to a gallery image")
            : translate("Choose a gallery image")}
        </summary>
        {value?.private_image_id && (
          <label className="checkbox-field">
            <input type="checkbox" name="useGallery" /> <Text>{"Use the selected gallery image"}</Text>
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
        <Text>{"Available to share with applicants"}</Text>
      </label>
    </ActionForm>
  );
}
