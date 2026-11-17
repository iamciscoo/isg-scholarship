import type { Metadata } from "next";
import { PageHero } from "@/components/public/page-hero";
import { FaqList } from "@/components/public/faq-list";
import { Cta } from "@/components/public/cta";
export const metadata: Metadata = { title: "Frequently asked questions", alternates: { canonical: "/faqs" } };
export default function Faqs() {
  return (
    <>
      <PageHero
        label="Common questions"
        title="Start with a little clarity."
        description="Understand how ISG works before you share your information or choose a service."
      />
      <div className="container page-body">
        <FaqList />
      </div>
      <Cta />
    </>
  );
}
