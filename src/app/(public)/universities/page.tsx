import { PageHero } from "@/components/public/page-hero";
import { UniversityLife } from "@/components/public/university-life";
import { Cta } from "@/components/public/cta";
export const metadata = {
  title: "University life",
  description:
    "Explore university environments and ISG support throughout the international application process.",
  alternates: { canonical: "/universities" },
};
export default function Universities() {
  return (
    <>
      <PageHero
        image="/images/university-campus-2.jpg"
        imageAlt="Jönköping University School of Engineering"
        label="University life"
        title="A place for your next chapter."
        description="Understand your options, prepare thoughtfully and stay informed throughout your application journey."
      />
      <UniversityLife />
      <section className="container page-body">
        <h2>Support through the application process.</h2>
        <div className="content-grid">
          {[
            [
              "Understand your options",
              "Discuss your academic background, preferred destinations and the university environment that suits your goals.",
            ],
            [
              "Prepare your application",
              "Work through requirements, supporting documents and personal statements with practical guidance from ISG.",
            ],
            [
              "Stay informed",
              "Keep track of your consultation and next steps in your account, with updates from your advisor.",
            ],
            [
              "Make the final choice",
              "Review the institution, relevant requirements and costs before you authorize an application.",
            ],
          ].map(([title, text]) => (
            <article className="content-panel" key={title}>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>
      <Cta />
    </>
  );
}
