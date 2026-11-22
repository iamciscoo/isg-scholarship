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
    "After verifying payment, ISG contacts you on WhatsApp to discuss your study plans.",
  ],
  [
    "Receive your package",
    "Your admin assigns a suitable package. Its details, fee and payment instructions appear in Applications.",
  ],
  [
    "Pay for the agreed package",
    "Pay the full ISG package fee and upload its receipt in the application. Once ISG verifies payment, complete the application form and upload your documents.",
  ],
  [
    "Follow the outcome",
    "Check application progress, advisor updates and provider decisions in your workspace.",
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
