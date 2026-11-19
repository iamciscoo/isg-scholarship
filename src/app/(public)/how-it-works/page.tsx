import type { Metadata } from "next";
import { PageHero } from "@/components/public/page-hero";
import { Cta } from "@/components/public/cta";
export const metadata: Metadata = { title: "How it works", alternates: { canonical: "/how-it-works" } };
const journey = [
  [
    "Share your starting point",
    "Register with your email and password, then complete the short consultation form. Tell us about your education, study interests and questions. No documents or guardian details are required at this stage.",
  ],
  [
    "Pay once for consultation",
    "Follow the TZS 50,000 payment instructions in your workspace, then upload your receipt for review.",
  ],
  [
    "Discuss your options",
    "Once payment is verified, request an advisor meeting. ISG confirms a time and Google Meet link in your workspace and queues an email. Follow-up questions and additional meeting requests are included, subject to scheduling.",
  ],
  [
    "Complete your profile",
    "After a completed consultation, your full application form unlocks with known details prefilled. Save drafts, provide requested documents and guardian contact information, then accept the electronic declaration and download your submitted PDF.",
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
    "Track each application independently, including dates, notes and next steps. ISG workflow updates are separate from official provider decisions. After acceptance, confirm your chosen place; rejected applications remain in history and your advisor can start another.",
  ],
];
export default function HowItWorks() {
  return (
    <>
      <PageHero
        image="/images/study-3.webp"
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
