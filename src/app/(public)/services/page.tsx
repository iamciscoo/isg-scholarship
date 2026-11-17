import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/public/page-hero";
import { Cta } from "@/components/public/cta";
export const metadata: Metadata = { title: "Our services", alternates: { canonical: "/services" } };
const services = [
  [
    "Initial eligibility review",
    "A review of your academic background and study goals to understand possible next steps. This is an initial assessment, not a confirmed scholarship match.",
  ],
  [
    "Scholarship advisory",
    "Personal guidance on potential study and funding pathways, including the requirements and practical considerations relevant to your profile.",
  ],
  [
    "Academic profile review",
    "Support in understanding your qualifications, experience and areas that may need preparation before you apply.",
  ],
  [
    "Application preparation",
    "Practical guidance with application requirements, supporting documents, CVs, personal statements and preparation timelines.",
  ],
  [
    "Personal consultations",
    "A focused discussion of your goals, questions and proposed application plan. Appointments are confirmed by an advisor.",
  ],
  [
    "Application follow-up",
    "Agreed support with preparation tasks, provider communications and application progress. The exact scope is confirmed before you commit.",
  ],
];
export default function Services() {
  return (
    <>
      <PageHero
        image="/images/study-2.jpg"
        label="Our services"
        title="The right support, at the right step."
        description="From understanding your options to preparing your application, choose guidance that fits where you are in your journey."
      />
      <div className="container page-body">
        <div className="notice">
          Service scope and any charges are agreed in writing. An initial enquiry does not commit you to a
          paid service.
        </div>
        <div className="content-grid">
          {services.map(([title, text]) => (
            <section className="content-panel" key={title}>
              <h2>{title}</h2>
              <p>{text}</p>
            </section>
          ))}
        </div>
        <p>
          University, scholarship provider, examination, translation and visa fees may be separate.{" "}
          <Link href="/pricing" className="text-link">
            Read about service fees
          </Link>
          .
        </p>
        <h2>You stay in control.</h2>
        <p>
          You will receive the provider name, relevant requirements, material costs and proposed use of your
          information before authorizing an application. We never ask for your official application portal
          password.
        </p>
      </div>
      <Cta />
    </>
  );
}
