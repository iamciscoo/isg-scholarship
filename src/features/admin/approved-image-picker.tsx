"use client";
import { Text, useWorkspaceText } from "@/lib/i18n/workspace-text";

import Image from "next/image";
import * as Menu from "@radix-ui/react-dropdown-menu";
import * as Popover from "@radix-ui/react-popover";
import { ChevronDown, Check, Upload, X } from "lucide-react";
import { useActionState, useEffect, useId, useRef, useState } from "react";
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
  const translate = useWorkspaceText();
  const id = useId();
  const [extra, setExtra] = useState<MarketingImage[]>([]);
  const [selected, setSelected] = useState(image || approvedImages[0]);
  const hidden = useRef<HTMLInputElement>(null);
  const previous = useRef(selected);
  useEffect(() => {
    const form = hidden.current?.form;
    const reset = () => setSelected(image || approvedImages[0]);
    form?.addEventListener("reset", reset);
    return () => form?.removeEventListener("reset", reset);
  }, [image]);
  useEffect(() => {
    if (previous.current === selected) return;
    previous.current = selected;
    hidden.current?.form?.dispatchEvent(new Event("change", { bubbles: true }));
  }, [selected]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const options = [...extra, ...images, ...builtIn].filter(
    (v, i, a) => a.findIndex((x) => x.path === v.path) === i,
  );
  if (!options.some((o) => o.path === selected))
    options.unshift({ id: selected, path: selected, label: "Selected marketing image" });
  const current = options.find((o) => o.path === selected)!;
  return (
    <div className="approved-image-picker">
      <label id={id}>{showUpload ? translate("Approved image") : translate("Gallery image")}</label>
      <input ref={hidden} type="hidden" name="image" value={selected} />
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
            <Text>{"Upload a marketing image"}</Text>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content className="marketing-upload-popover" sideOffset={8} collisionPadding={12}>
              <Popover.Close aria-label={translate("Close image upload")} className="upload-close">
                <X size={18} />
              </Popover.Close>
              <h3>
                <Text>{"Upload a public image"}</Text>
              </h3>
              <p>
                <Text>
                  {
                    "Marketing images are public. Never upload receipts, applicant documents or personal information here."
                  }
                </Text>
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
          <Text>
            {
              "Campus photos illustrate study environments. They do not imply an ISG partnership or a guaranteed place."
            }
          </Text>
        </p>
      )}
    </div>
  );
}
function ImageUpload({ onUploaded }: { onUploaded: (image: MarketingImage) => void }) {
  const translate = useWorkspaceText();
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
        <Text>{"Public image label"}</Text>
        <input name="label" maxLength={140} required disabled={pending} />
      </label>
      <label>
        <Text>{"Image file"}</Text>
        <input type="file" name="file" accept="image/jpeg,image/png,image/webp" required disabled={pending} />
      </label>
      <small>
        <Text>
          {"JPEG, PNG or WebP, up to 5 MB. Location metadata is removed and the file is saved as WebP."}
        </Text>
      </small>
      {state.error && (
        <p role="alert" className="notice notice-error">
          {translate(state.error)}
        </p>
      )}
      <button className="button button-primary" disabled={pending}>
        {pending ? (
          <>
            <Text>{"Uploading"}</Text>
            <LoadingDots />
          </>
        ) : (
          translate("Upload public image")
        )}
      </button>
    </form>
  );
}
