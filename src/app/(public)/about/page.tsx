import type { Metadata } from "next";
import { PageHero } from "@/components/public/page-hero";
import { Cta } from "@/components/public/cta";
export const metadata: Metadata = { title: "About ISG", alternates: { canonical: "/about" } };
export default function About() {
  return (
    <>
      <PageHero
        image="/images/university-campus-3.jpg"
        imageAlt="University of Oklahoma campus in autumn"
        label="About ISG"
        title="Ambition deserves a way forward."
        description="We inform and support students throughout the international application process, from understanding their options to preparing applications and following up on the next steps."
      />
      <div className="container page-body">
        <h2>Guidance for the journey ahead.</h2>
        <p>
          International Scholarship Gateway is an independent education advisory service for students
          exploring international study and funding. We help you understand your options, prepare your
          academic profile and approach applications with a clear plan.
        </p>
        <p>
          Our initial focus is supporting students from Tanzania, while welcoming enquiries from students with
          a wide range of backgrounds. Your nationality, qualifications, goals and circumstances all matter
          when considering a pathway.
        </p>
        <div className="content-grid">
          <section className="content-panel">
            <h2>Our purpose</h2>
            <p>
              Make the path to international education easier to understand, so students can take practical
              steps toward their goals.
            </p>
          </section>
          <section className="content-panel">
            <h2>Our approach</h2>
            <p>
              Listen first. Review carefully. Explain the options honestly. Keep students involved in every
              decision about their applications.
            </p>
          </section>
        </div>
        <h2>A relationship built on clarity.</h2>
        <p>
          ISG is not a university, scholarship provider or immigration authority. We do not make funding,
          admissions or visa decisions. We explain the scope of our support and any fees before you choose a
          service.
        </p>
        <p>
          We keep internal research private while giving you the provider details and material information you
          need before you authorize an application. Your data and your decisions deserve the same care as your
          ambitions.
        </p>
      </div>
      <Cta />
    </>
  );
}
