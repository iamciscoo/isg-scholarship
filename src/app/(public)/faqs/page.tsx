import type { Metadata } from "next";
import { PageHero } from "@/components/public/page-hero";
import { FaqList } from "@/components/public/faq-list";
import { Cta } from "@/components/public/cta";
import { getMessages } from "@/lib/i18n/server";
export const metadata: Metadata = { title: "Frequently asked questions", alternates: { canonical: "/faqs" } };
export default async function Faqs() {
  const { ui, home } = await getMessages();
  return (
    <>
      <PageHero label={ui.faq} title={home.faqTitle} description={home.faqText} />
      <div className="container page-body">
        <FaqList />
      </div>
      <Cta />
    </>
  );
}
