import type { Metadata } from "next";
import { PageHero } from "@/components/public/page-hero";
export const metadata: Metadata = { title: "Service terms", alternates: { canonical: "/terms" } };
export default function Terms() {
  return (
    <>
      <PageHero
        label="Service terms"
        title="Clear expectations, from the start."
        description="The principles that guide your use of the ISG platform."
      />
      <article className="container page-body legal-copy">
        <h2>Independent advisory support</h2>
        <p>
          ISG provides education advisory and application support. It does not award scholarships, grant
          admission or issue visas. Information is general until reviewed for your circumstances. Providers
          may change requirements, fees and deadlines.
        </p>
        <h2>Your responsibilities</h2>
        <p>
          Provide accurate information, protect your account and review documents before approving them. Do
          not share official application portal passwords. Use the platform lawfully and do not attempt to
          access another person’s data or internal research.
        </p>
        <h2>Applications and authorization</h2>
        <p>
          Before authorizing a proposed application, you must receive the provider details, relevant selection
          requirements, material costs and information about where your data will be sent. No initial
          assessment constitutes permission to submit an application.
        </p>
        <h2>Fees, cancellation and refunds</h2>
        <p>
          An enquiry does not create a paid engagement. The agreed service quote must specify fees, currency,
          scope, payment arrangements and cancellation or refund terms. No general refund schedule is
          published until ISG approves one. Ask for these terms before paying.
        </p>
        <h2>No guaranteed outcome</h2>
        <p>
          Funding, admissions and immigration decisions are made independently by the relevant bodies. Neither
          an assessment nor payment guarantees a scholarship, admission or visa.
        </p>
        <h2>Personal information</h2>
        <p>
          Read the privacy information before submitting an assessment. Contact ISG about corrections or
          personal data requests. Do not include sensitive documents in an initial enquiry.
        </p>
      </article>
    </>
  );
}
