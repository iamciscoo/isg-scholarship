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
          serve the platform. Student-life imagery is stored locally from Pexels; loading it does not call the
          Pexels API. GREEN-API can deliver generic event notifications to ISG’s private staff group. Raw
          receipts, applicant documents and sensitive personal details are excluded from group alerts; staff
          links require authorized sign-in.
        </p>
        <h2>Later application and payment records</h2>
        <p>
          After consultation submission, you can upload a private payment receipt for administrator
          verification. After a completed consultation, the full application stage asks for the documents and
          guardian or nominated-contact details needed for the agreed work. Inform your nominated contact
          before sharing their details. Submitted declarations record their version, acceptance time and an
          immutable copy of your answers. Individual provider applications require your separate approval of
          the disclosed opportunity. PDF files require malware scanning; images are decoded and re-encoded
          before storage.
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
