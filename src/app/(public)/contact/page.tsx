import type { Metadata } from "next";
import { headers } from "next/headers";
import { PageHero } from "@/components/public/page-hero";
import { ContactForm } from "@/features/contact/contact-form";
import { contactConfigured, contactChallengeRequired } from "@/lib/supabase/config";
import { site } from "@/config/site";
export const metadata: Metadata = { title: "Speak with an advisor", alternates: { canonical: "/contact" } };
export default async function Contact({ searchParams }: { searchParams: Promise<{ topic?: string }> }) {
  const query = await searchParams;
  const topic =
    query.topic === "privacy"
      ? "Privacy request"
      : query.topic === "fees"
        ? "Service fees"
        : query.topic === "consultation"
          ? "Consultation"
          : "General enquiry";
  return (
    <>
      <PageHero
        image="/images/study-2.webp"
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
            Register to start a consultation and keep track of your next steps in your workspace.
          </p>
        </div>
        <ContactForm
          enabled={contactConfigured()}
          challengeRequired={contactChallengeRequired()}
          topic={topic}
          nonce={(await headers()).get("x-nonce") || undefined}
        />
      </div>
    </>
  );
}
