import { Text } from "@/lib/i18n/workspace-text";
import { getWorkspaceText } from "@/lib/i18n/server";
import { ActionForm } from "@/components/forms/action-form";
import { savePromotion } from "./opportunity-actions";
import { ApprovedImagePicker } from "./approved-image-picker";
import { getEditorMarketingImages } from "@/server/repositories/marketing-images";
import { DestinationSelect } from "@/features/consultations/destination-select";
import { countries } from "@/lib/countries";
import { programmeFields } from "@/config/programme-areas";
import { studyLevels } from "@/lib/validation/assessment";
import type { Programme } from "@/lib/programmes";

export async function ProgrammeEditor({ value }: { value?: Programme }) {
  const [images, t] = await Promise.all([getEditorMarketingImages(), getWorkspaceText()]);
  return (
    <ActionForm key={value?.id || "new-programme"} action={savePromotion} label="Save programme">
      <input type="hidden" name="id" value={value?.id || ""} />
      <label>
        <Text>Programme title</Text>
        <input name="title" maxLength={160} required defaultValue={value?.title || ""} />
      </label>
      <div className="programme-editor-grid">
        <label>
          <Text>Study level</Text>
          <select name="studyLevel" defaultValue={value?.study_level || studyLevels[0]}>
            {[...new Set([...studyLevels, ...(value ? [value.study_level] : [])])].map((v) => (
              <option key={v} value={v}>
                {t(v)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <Text>Academic field</Text>
          <select name="field" defaultValue={value?.field || programmeFields[0].value}>
            {[...new Set([...programmeFields.map((f) => f.value), ...(value ? [value.field] : [])])].map(
              (v) => (
                <option key={v} value={v}>
                  {t(programmeFields.find((f) => f.value === v)?.label || v)}
                </option>
              ),
            )}
          </select>
        </label>
      </div>
      <div className="field">
        <label htmlFor="programme-countries">
          <Text>Destinations</Text>
        </label>
        <DestinationSelect
          id="programme-countries"
          label="Destinations"
          name="destinations"
          multiple
          options={[...new Set([...(value?.destinations || []), ...countries.map((c) => c.name)])]}
          defaultValue={value?.destinations || []}
        />
      </div>
      <label>
        <Text>Funding</Text>
        <input
          name="fundingType"
          maxLength={200}
          required
          defaultValue={value?.funding_type || "Discuss with advisor"}
        />
      </label>
      <label>
        <Text>Programme description</Text>
        <textarea name="eligibility" maxLength={2000} defaultValue={value?.eligibility || ""} />
      </label>
      <ApprovedImagePicker image={value?.image} images={images} />
      <label className="checkbox-field">
        <input type="checkbox" name="published" defaultChecked={value?.published || false} />
        <Text>Available on Study Paths</Text>
      </label>
    </ActionForm>
  );
}
