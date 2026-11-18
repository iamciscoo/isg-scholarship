"use client";
import Image from "next/image";
import { useId, useState } from "react";
import { approvedImages } from "@/lib/validation/opportunities";
const labels: Record<(typeof approvedImages)[number], string> = {
  "/images/study-1.jpg": "Students exploring a university library",
  "/images/study-2.jpg": "Students working together in a library",
  "/images/study-3.jpg": "Collaborative study and research",
  "/images/university-campus-1.jpg": "University of Pretoria · South Africa",
  "/images/university-campus-2.jpg": "Jönköping University · Sweden",
  "/images/university-campus-3.jpg": "University of Oklahoma · United States",
  "/images/study-together.jpg": "Students sharing ideas outdoors",
  "/images/campus-life.jpg": "Students in a university corridor",
};
export function ApprovedImagePicker({ image }: { image?: string }) {
  const id = useId();
  const [selected, setSelected] = useState(approvedImages.find((p) => p === image) || approvedImages[0]);
  return (
    <div className="approved-image-picker">
      <label htmlFor={id}>Approved image</label>
      <select
        id={id}
        name="image"
        value={selected}
        onChange={(e) => {
          const next = approvedImages.find((p) => p === e.target.value);
          if (next) setSelected(next);
        }}
      >
        {approvedImages.map((p) => (
          <option key={p} value={p}>
            {labels[p]}
          </option>
        ))}
      </select>
      <div className="approved-image-preview">
        <Image src={selected} fill sizes="320px" alt={labels[selected]} />
      </div>
      <p>
        Campus photos illustrate study environments. They do not imply an ISG partnership or a guaranteed
        place.
      </p>
    </div>
  );
}
