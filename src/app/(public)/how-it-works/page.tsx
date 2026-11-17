import type { Metadata } from "next";
import { PageHero } from "@/components/public/page-hero";
import { Cta } from "@/components/public/cta";
export const metadata: Metadata = { title: "How it works", alternates: { canonical: "/how-it-works" } };
const journey = [
  [
    "Share your starting point",
    "Complete the guest eligibility assessment. Tell us about your qualifications, preferred level and goals. No documents are required at this stage.",
  ],
  [
    "Receive an initial review",
    "An advisor reviews your information and contacts you about your circumstances and possible next steps. Additional information may be requested.",
  ],
  [
    "Discuss your options",
    "Where appropriate, arrange a consultation to talk about the pathways, preparation and support that may be relevant to you.",
  ],
  [
    "Complete your profile",
    "Create a verified account and confirm your personal and academic information. Provide only the information needed for the agreed work.",
  ],
  [
    "Agree on a plan",
    "Review the proposed opportunities, service scope, any fees and the requirements you will need to meet.",
  ],
  [
    "Authorize your applications",
    "Understand the scholarship provider, material costs and data-sharing destination before giving permission for each selected application.",
  ],
  [
    "Prepare and submit",
    "Work through documents and application tasks with your advisor, following each provider's submission rules.",
  ],
  [
    "Follow the outcome",
    "Keep in contact about requests, provider decisions and next steps. The awarding institution makes the final decision.",
  ],
];
export default function HowItWorks() {
  return (
    <>
      <PageHero
        label="How it works"
        title="A clear path. One step at a time."
        description="Know what happens next, what we need from you and where your decisions fit into the process."
      />
      <div className="container page-body">
        <ol className="journey-list">
          {journey.map(([title, text]) => (
            <li key={title}>
              <h2>{title}</h2>
              <p>{text}</p>
            </li>
          ))}
        </ol>
      </div>
      <Cta />
    </>
  );
}
