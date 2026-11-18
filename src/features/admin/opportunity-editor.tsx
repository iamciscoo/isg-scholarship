import { ActionForm } from "@/components/forms/action-form";
import { saveOpportunity, savePackage, savePromotion } from "./opportunity-actions";
import { type Opportunity } from "@/lib/validation/opportunities";
import { ApprovedImagePicker } from "./approved-image-picker";
import { getMarketingImages } from "@/server/repositories/marketing-images";
export async function OpportunityEditor({ value }: { value?: Opportunity }) {
  const images = await getMarketingImages();
  const fields = [
    { key: "name", label: "Internal opportunity / scholarship name", value: value?.name, max: 200 },
    { key: "provider", label: "Actual provider / university", value: value?.provider, max: 200 },
    { key: "destination", label: "Destination", value: value?.destination, max: 100 },
    { key: "studyLevel", label: "Study level", value: value?.study_level, max: 80 },
    { key: "field", label: "Academic field", value: value?.field, max: 160 },
  ];
  return (
    <ActionForm
      key={value?.id || "new-opportunity"}
      action={saveOpportunity}
      label={value ? "Save private opportunity" : "Create private opportunity"}
    >
      <input type="hidden" name="id" value={value?.id || ""} />
      <div className="form-grid">
        {fields.map((f) => (
          <label key={f.key}>
            {f.label}
            <input name={f.key} defaultValue={f.value || ""} maxLength={f.max} required />
          </label>
        ))}
        <label>
          Provider deadline
          <input name="deadline" type="date" defaultValue={value?.deadline || ""} />
        </label>
      </div>
      <label>
        Requirements (shared with the applicant in a proposal)
        <textarea name="requirements" defaultValue={value?.requirements || ""} maxLength={10000} />
      </label>
      <label>
        Staff-only research notes
        <textarea name="staffNotes" defaultValue={value?.research_notes || ""} maxLength={5000} />
      </label>
      <label>
        Authoritative source URL
        <input
          name="sourceUrl"
          type="url"
          defaultValue={value?.source_url || ""}
          placeholder="https://"
          required
        />
      </label>
      <div className="form-grid">
        <label>
          Provider / university fee (blank if not confirmed)
          <input
            name="providerFee"
            type="number"
            min="0"
            step="0.01"
            defaultValue={value?.provider_fee ?? ""}
          />
        </label>
        <label>
          Provider fee currency
          <select name="providerCurrency" defaultValue={value?.provider_currency || "TZS"}>
            {["TZS", "USD", "EUR", "GBP", "RUB"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>
      <ApprovedImagePicker image={value?.image} images={images} />
      <label className="checkbox-field">
        <input type="checkbox" name="active" defaultChecked={value?.active ?? true} />
        Active for private matching
      </label>
      <p>
        Nothing in this form is published publicly. Provider requirements shared in a proposal are visible to
        that applicant; keep staff-only research notes outside the requirements field.
      </p>
    </ActionForm>
  );
}
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
            {f.label}
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
        Broad eligibility summary
        <textarea name="eligibility" maxLength={2000} defaultValue={value?.eligibility || ""} />
      </label>
      <ApprovedImagePicker image={value?.image} images={images} />
      <label className="checkbox-field">
        <input type="checkbox" name="published" defaultChecked={value?.published || false} />
        Publish this broad promotion on Study Paths
      </label>
      <label className="checkbox-field">
        <input type="checkbox" name="reviewed" />I reviewed this public copy. It does not reveal actual
        scholarship names, confidential research or the internal shortlist.
      </label>
    </ActionForm>
  );
}
export type ServicePackage = {
  id: string;
  name: string;
  description: string;
  price_tzs: number;
  active: boolean;
  promoted: boolean;
};
export function PackageEditor({ value }: { value?: ServicePackage }) {
  return (
    <ActionForm key={value?.id || "new-package"} action={savePackage} label="Save service package">
      <input type="hidden" name="id" value={value?.id || ""} />
      <label>
        ISG package name
        <input name="name" defaultValue={value?.name || ""} maxLength={160} required />
      </label>
      <label>
        Included ISG support and scope
        <textarea name="description" defaultValue={value?.description || ""} maxLength={3000} />
      </label>
      <label>
        Total ISG price (TZS, including the TZS 50,000 consultation fee)
        <input
          name="price"
          type="number"
          min={50000}
          max={100000000}
          step={1}
          defaultValue={value?.price_tzs || ""}
          required
        />
      </label>
      <label className="checkbox-field">
        <input name="active" type="checkbox" defaultChecked={value?.active ?? true} />
        Active package
      </label>
      <label className="checkbox-field">
        <input name="promoted" type="checkbox" defaultChecked={value?.promoted || false} />
        Show this package price to applicants and on the public fee page
      </label>
      <p>Provider and university fees are separate. Price changes do not alter an already accepted quote.</p>
    </ActionForm>
  );
}
