import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/public/page-hero";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { authConfigured } from "@/lib/supabase/config";
export const metadata: Metadata = { title: "Service fees", alternates: { canonical: "/pricing" } };
export default async function Pricing() {
  let packages: { id: string; name: string; description: string; price_tzs: number }[] = [];
  if (authConfigured()) {
    const db = await createClient();
    const result = await db
      .from("service_packages")
      .select("id,name,description,price_tzs")
      .eq("active", true)
      .eq("promoted", true)
      .order("price_tzs");
    if (result.error) throw Error("Service fees unavailable");
    packages = result.data || [];
  }
  return (
    <>
      <PageHero
        label="Service fees"
        title="Know the cost before you commit."
        description="Your service scope, fees and payment terms should be clear before any paid advisory work begins."
      />
      <div className="container page-body">
        <section className="content-panel">
          <h2>Consultation · TZS 50,000, paid once.</h2>
          <p>
            Submit your short consultation form to see payment instructions and upload a private receipt. ISG
            verifies the actual payment before scheduling. Your consultation fee is credited toward a later
            ISG service package. Follow-up questions and additional meeting requests do not incur another
            consultation fee; meetings depend on scheduling.
          </p>
          <div className="mt-6">
            <Button asChild>
              <Link href="/consultation">Start consultation</Link>
            </Button>
          </div>
        </section>
        <section className="mt-10">
          <h2>ISG service packages</h2>
          {!packages.length ? (
            <p>
              Contact ISG for the current service scope and written quote. Only administrator-approved package
              prices are published here.
            </p>
          ) : (
            <div className="operation-grid">
              {packages.map((p) => (
                <article className="operation-card" key={p.id}>
                  <h3>{p.name}</h3>
                  <p>{p.description}</p>
                  <strong>TZS {p.price_tzs.toLocaleString("en")}</strong>
                  <p>
                    Includes your TZS 50,000 consultation credit. Remaining ISG fee after verified
                    consultation: TZS {(p.price_tzs - 50000).toLocaleString("en")}. Provider and university
                    charges are separate.
                  </p>
                  <Link href="/dashboard/applications" className="text-link">
                    Review package in your workspace →
                  </Link>
                </article>
              ))}
            </div>
          )}
        </section>
        <h2 className="mt-10">What your quote should explain</h2>
        <ul className="journey-list">
          <li>The exact support included and any optional services.</li>
          <li>The total fee, currency, payment schedule and relevant taxes.</li>
          <li>Third-party costs that are separate from ISG fees.</li>
          <li>Cancellation, rescheduling and refund terms for the chosen service.</li>
        </ul>
        <p>
          Payment does not guarantee funding, admission or a visa. Pay only through a method confirmed by ISG
          and request a receipt for verified payments. Do not send card details or payment credentials through
          an enquiry form.
        </p>
      </div>
    </>
  );
}
