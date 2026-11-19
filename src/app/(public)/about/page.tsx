import type { Metadata } from "next";
import { PageHero } from "@/components/public/page-hero";
import Link from "next/link";
export const metadata: Metadata = { title: "About ISG", alternates: { canonical: "/about" } };
export default function About() {
  return (
    <>
      <PageHero
        image="/images/university-campus-3.webp"
        imageAlt="University of Oklahoma campus in autumn"
        label="About ISG"
        title="Ambition deserves a way forward."
        description="Personal guidance for international study, from your first questions to your application’s next steps."
      />
      <div className="container page-body">
        <h2>A clear path, with support.</h2>
        <p>
          International Scholarship Gateway helps students explore study and funding options abroad. Starting
          with Tanzania, we welcome students from a wide range of backgrounds.
        </p>
        <ul className="about-support-list">
          <li>Understand destinations, requirements and suitable study paths.</li>
          <li>Prepare documents and applications with an advisor.</li>
          <li>Follow progress and make informed decisions in your private workspace.</li>
        </ul>
        <p>
          We explain ISG fees and provider details before you commit. Admission, funding and visa decisions
          rest with the relevant institutions; no outcome is guaranteed.
        </p>
        <Link href="/contact?topic=consultation" className="text-link">
          Speak with an advisor →
        </Link>
      </div>
    </>
  );
}
