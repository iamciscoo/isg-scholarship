import type { Metadata } from "next";
import { headers } from "next/headers";
import { PageHero } from "@/components/public/page-hero";
import { ContactForm } from "@/features/contact/contact-form";
import { intakeConfigured } from "@/lib/supabase/config";
import { site } from "@/config/site";
export const metadata: Metadata = { title: "Speak with an advisor", alternates: { canonical: "/contact" } };
export default async function Contact({ searchParams }: { searchParams: Promise<{ topic?: string }> }) {
  const query = await searchParams;
  const topic =
    query.topic === "privacy"
      ? "Privacy request"
      : query.topic === "fees"
        ? "Service fees"
        : "General enquiry";
  return (
    <>
      <PageHero
        image="/images/study-2.jpg"
        label="Let’s talk"
        title="Every journey starts with a question."
        description="Tell us what’s on your mind. We’ll help you understand your next step."
      />
      <div className="container page-body contact-layout">
        <div className="contact-info">
          <h2>Speak with ISG.</h2>
          <p>For questions about study pathways, advisory support or service fees, send us an enquiry.</p>
          <p>
            <a href={`mailto:${site.email}`}>{site.email}</a>
          </p>
          <h3 className="mb-3">Planning a consultation?</h3>
          <p>
            Choose “Consultation” in the form. An advisor will discuss availability with you. Sending an
            enquiry does not confirm an appointment.
          </p>
          <p className="field-help">
            Prefer to start with your goals? Complete the initial eligibility assessment without an account.
          </p>
        </div>
        <ContactForm
          enabled={intakeConfigured()}
          topic={topic}
          nonce={(await headers()).get("x-nonce") || undefined}
        />
      </div>
    </>
  );
}
