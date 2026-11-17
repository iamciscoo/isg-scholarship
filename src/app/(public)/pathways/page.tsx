import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PageHero } from "@/components/public/page-hero";
import { Cta } from "@/components/public/cta";
import { pathways } from "@/config/content";
export const metadata: Metadata = { title: "Study pathways", alternates: { canonical: "/pathways" } };
export default function Pathways() {
  return (
    <>
      <PageHero
        image="/images/study-1.jpg"
        label="Study pathways"
        title="There’s more than one way forward."
        description="Explore the broad routes into international education. A personal review helps put the possibilities in context."
      />
      <div className="container page-body">
        {pathways.map((path) => (
          <section id={path.slug} key={path.slug} className="content-panel pathway-detail">
            <p>{path.degree}</p>
            <h2>{path.title}</h2>
            <p>{path.description}</p>
            <ul>
              {path.details.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
            <Link className="text-link" href="/consultation">
              Start consultation <ArrowUpRight size={17} />
            </Link>
          </section>
        ))}
        <h2>Understand the funding.</h2>
        <p>
          Support may include tuition awards, partial funding, living-cost support or research funding.
          Coverage, eligibility and obligations vary by provider. A funded place may still involve costs you
          need to plan for.
        </p>
        <p>
          Destinations and individual opportunities are discussed in the context of your profile. ISG’s
          curated research is private; details of any proposed application are shared with you before
          authorization.
        </p>
      </div>
      <Cta />
    </>
  );
}
