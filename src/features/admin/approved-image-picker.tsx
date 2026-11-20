"use client";
import Image from "next/image";
import * as Menu from "@radix-ui/react-dropdown-menu";
import * as Popover from "@radix-ui/react-popover";
import { ChevronDown, Check, Upload, X } from "lucide-react";
import { useActionState, useId, useState } from "react";
import { approvedImages } from "@/lib/validation/opportunities";
import type { MarketingImage } from "@/server/repositories/marketing-images";
import { uploadMarketingImage, type MarketingUploadState } from "./marketing-actions";
import { LoadingDots } from "@/components/ui/loading-dots";
const labels = [
  "Students exploring a university library",
  "Students working together in a library",
  "Collaborative study and research",
  "University of Pretoria · South Africa",
  "Jönköping University · Sweden",
  "University of Oklahoma · United States",
  "Students sharing ideas outdoors",
  "Students in a university corridor",
  "Graduation celebrations · Singapore",
  "Library and independent study",
  "Discovering Kyoto · Japan",
];
const builtIn = approvedImages.map((path, i) => ({ id: path, path, label: labels[i] }));
export function ApprovedImagePicker({
  image,
  images = [],
  showUpload = true,
}: {
  image?: string;
  images?: MarketingImage[];
  showUpload?: boolean;
}) {
  const id = useId();
  const [extra, setExtra] = useState<MarketingImage[]>([]);
  const [selected, setSelected] = useState(image || approvedImages[0]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const options = [...extra, ...images, ...builtIn].filter(
    (v, i, a) => a.findIndex((x) => x.path === v.path) === i,
  );
  if (!options.some((o) => o.path === selected))
    options.unshift({ id: selected, path: selected, label: "Selected marketing image" });
  const current = options.find((o) => o.path === selected)!;
  return (
    <div className="approved-image-picker">
      <label id={id}>{showUpload ? "Approved image" : "Gallery image"}</label>
      <input type="hidden" name="image" value={selected} />
      <Menu.Root>
        <Menu.Trigger className="image-picker-trigger" aria-labelledby={id}>
          <Image src={selected} alt="" width={56} height={38} />
          <span>{current.label}</span>
          <ChevronDown size={18} />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Content className="image-picker-menu" sideOffset={6} collisionPadding={12}>
            <Menu.RadioGroup value={selected} onValueChange={setSelected}>
              {options.map((o) => (
                <Menu.RadioItem className="image-picker-option" key={o.path} value={o.path}>
                  <Image src={o.path} alt="" width={64} height={44} />
                  <span>{o.label}</span>
                  <Menu.ItemIndicator>
                    <Check size={16} />
                  </Menu.ItemIndicator>
                </Menu.RadioItem>
              ))}
            </Menu.RadioGroup>
          </Menu.Content>
        </Menu.Portal>
      </Menu.Root>
      <div className="approved-image-preview">
        <Image src={selected} fill sizes="320px" alt={current.label} />
      </div>
      {showUpload && (
        <Popover.Root modal open={uploadOpen} onOpenChange={setUploadOpen}>
          <Popover.Trigger className="button button-outline" type="button">
            <Upload size={16} />
            Upload a marketing image
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content className="marketing-upload-popover" sideOffset={8} collisionPadding={12}>
              <Popover.Close aria-label="Close image upload" className="upload-close">
                <X size={18} />
              </Popover.Close>
              <h3>Upload a public image</h3>
              <p>
                Marketing images are public. Never upload receipts, applicant documents or personal
                information here.
              </p>
              <ImageUpload
                onUploaded={(item) => {
                  setExtra((v) => [item, ...v]);
                  setSelected(item.path);
                  setUploadOpen(false);
                }}
              />
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      )}
      {showUpload && (
        <p>
          Campus photos illustrate study environments. They do not imply an ISG partnership or a guaranteed
          place.
        </p>
      )}
    </div>
  );
}
function ImageUpload({ onUploaded }: { onUploaded: (image: MarketingImage) => void }) {
  const [state, submit, pending] = useActionState<MarketingUploadState, FormData>(async (previous, fd) => {
    const result = await uploadMarketingImage(previous, fd);
    if (result.image) onUploaded(result.image);
    return result;
  }, {});
  return (
    <form
      action={submit}
      className="form-stack"
      onSubmit={(e) => e.stopPropagation()}
      onReset={(e) => e.preventDefault()}
      aria-busy={pending}
    >
      <label>
        Public image label
        <input name="label" maxLength={140} required disabled={pending} />
      </label>
      <label>
        Image file
        <input type="file" name="file" accept="image/jpeg,image/png,image/webp" required disabled={pending} />
      </label>
      <small>JPEG, PNG or WebP, up to 2 MB. Location metadata is removed.</small>
      {state.error && (
        <p role="alert" className="notice notice-error">
          {state.error}
        </p>
      )}
      <button className="button button-primary" disabled={pending}>
        {pending ? (
          <>
            Uploading
            <LoadingDots />
          </>
        ) : (
          "Upload public image"
        )}
      </button>
    </form>
  );
}
