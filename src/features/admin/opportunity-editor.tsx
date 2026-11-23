import { Text } from "@/lib/i18n/workspace-text";
import { ActionForm } from "@/components/forms/action-form";
import { savePromotion } from "./opportunity-actions";
import { ApprovedImagePicker } from "./approved-image-picker";
import { getMarketingImages } from "@/server/repositories/marketing-images";
export type Promotion = {
  id: string;
  title: string;
  destination: string;
  study_level: string;
  field: string;
  funding_type: string;
  eligibility: string;
  image: string;
  published: boolean;
};
export async function PromotionEditor({ value }: { value?: Promotion }) {
  const images = await getMarketingImages();
  const fields = [
    { key: "title", label: "Broad public title", value: value?.title },
    { key: "destination", label: "Destination", value: value?.destination },
    { key: "studyLevel", label: "Study level", value: value?.study_level },
    { key: "field", label: "Field", value: value?.field },
    { key: "fundingType", label: "Funding types (broad description)", value: value?.funding_type },
  ];
  return (
    <ActionForm key={value?.id || "new-promotion"} action={savePromotion} label="Save public promotion">
      <input type="hidden" name="id" value={value?.id || ""} />
      <div className="form-grid">
        {fields.map((f) => (
          <label key={f.key}>
            {<Text>{f.label}</Text>}
            <input
              name={f.key}
              maxLength={
                f.key === "destination"
                  ? 100
                  : f.key === "studyLevel"
                    ? 80
                    : f.key === "fundingType"
                      ? 200
                      : 160
              }
              required
              defaultValue={f.value || ""}
            />
          </label>
        ))}
      </div>
      <label>
        <Text>{"Broad eligibility summary"}</Text>
        <textarea name="eligibility" maxLength={2000} defaultValue={value?.eligibility || ""} />
      </label>
      <ApprovedImagePicker image={value?.image} images={images} />
      <label className="checkbox-field">
        <input type="checkbox" name="published" defaultChecked={value?.published || false} />
        <Text>{"Publish this broad promotion on Study Paths"}</Text>
      </label>
      <label className="checkbox-field">
        <input type="checkbox" name="reviewed" />
        <Text>
          {
            "I reviewed this public copy. It does not reveal actual scholarship names, confidential research or the internal shortlist."
          }
        </Text>
      </label>
    </ActionForm>
  );
}
