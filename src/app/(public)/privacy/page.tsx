import type { Metadata } from "next";
import { PageHero } from "@/components/public/page-hero";
import { site } from "@/config/site";
export const metadata: Metadata = { title: "Privacy information", alternates: { canonical: "/privacy" } };
export default function Privacy() {
  return (
    <>
      <PageHero
        label="Your information"
        title="Privacy starts with clarity."
        description="How this platform handles your assessment and account information."
      />
      <article className="container page-body legal-copy">
        <div className="notice">
          Pre-launch privacy information. ISG must confirm its legal entity, privacy contact, retention
          schedule and applicable transfer arrangements before enabling public intake.
        </div>
        <h2>What we collect and why</h2>
        <p>
          The initial assessment asks for your contact details, nationality and country of residence, academic
          background and study preferences. We use this information to review your enquiry and contact you
          about relevant next steps. It does not ask for passports, transcripts, detailed family information
          or payment credentials.
        </p>
        <h2>Accounts and access</h2>
        <p>
          If you create an account, Supabase Auth manages your credentials, recovery links and session. Email
          confirmation is not required for registration. Records are attached to your authenticated account
          ID; an email match cannot claim someone else’s records. Authorized administrators and assigned
          advisors can review records for the purposes of the service.
        </p>
        <h2>Service providers</h2>
        <p>
          When configured, Supabase hosts the database and authentication, Resend delivers service emails, and
          Cloudflare Turnstile checks submissions for abuse. The hosting provider processes requests needed to
          serve the platform. Student-life imagery from Pexels is served with the site. When WhatsApp delivery
          is configured, GREEN-API sends alerts and copies of uploaded payment receipts to ISG’s private staff
          group. Cover unrelated account details before uploading a receipt.
        </p>
        <h2>Later application and payment records</h2>
        <p>
          ISG uses consultation and package receipts to verify payment. When you save an interest or confirm a
          package, ISG records it in your Applications. Advisors may request documents needed for an
          individual provider application. Inform your nominated contact before sharing their details.
          Provider applications require your separate approval. The platform re-encodes images and checks PDFs
          before storage. When the PDF scanner is unavailable by configuration, the platform saves the visible
          pages as images in a new PDF. Keep any digitally signed original.
        </p>
        <h2>Consent and communications</h2>
        <p>
          Assessment-processing consent is required to submit an assessment. Marketing permission is a
          separate, optional choice. Declining marketing does not prevent an assessment. Application
          authorization and institutional data sharing require a separate, informed decision.
        </p>
        <h2>Retention and your choices</h2>
        <p>
          ISG must define and implement a retention schedule before production collection, including audit
          history, service-provider records and backups. Contact ISG to request access, correction, export,
          deletion or withdrawal of optional consent. Identity verification may be needed to protect your
          records. Legal or operational obligations may affect deletion, and ISG must explain any applicable
          restriction.
        </p>
        <h2>Students under 18</h2>
        <p>
          This initial self-service assessment is for people aged 18 or over. A parent or guardian should
          contact ISG directly to discuss an appropriate process for a younger student. Do not submit a
          minor’s personal information in this form.
        </p>
        <h2>Contact</h2>
        <p>
          For privacy enquiries, email{" "}
          <a href={`mailto:${site.email}?subject=Privacy%20request`}>{site.email}</a>. Do not attach identity
          documents or academic records to your initial message.
        </p>
      </article>
    </>
  );
}
