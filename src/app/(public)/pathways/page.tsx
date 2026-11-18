import type { Metadata } from "next";
import { PageHero } from "@/components/public/page-hero";
import { Cta } from "@/components/public/cta";
import { StudyPaths } from "@/features/consultations/study-paths";
import { UniversityLife } from "@/components/public/university-life";
export const metadata: Metadata = { title: "Study paths", alternates: { canonical: "/pathways" } };
export default async function Pathways({
  searchParams,
}: {
  searchParams: Promise<{ level?: string; field?: string; destination?: string }>;
}) {
  return (
    <>
      <PageHero
        image="/images/reference-library.jpg"
        imageAlt="University library with space for study and research"
        label="Study paths"
        title="Find your study path."
        description="Explore programmes, destinations and campus life with guidance through every stage of your application."
      />
      <StudyPaths query={await searchParams} />
      <div id="campus-life">
        <UniversityLife withinPaths />
      </div>
      <Cta />
    </>
  );
}
