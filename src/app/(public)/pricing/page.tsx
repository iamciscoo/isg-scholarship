import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/public/page-hero";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Service fees", alternates: { canonical: "/pricing" } };
export default function Pricing() {
  return (
    <>
      <PageHero
        label="Service fees"
        title="Know your fees before applying."
        description="See what the consultation covers and when you’ll receive your package price."
      />
      <div className="container page-body operation-grid">
        <section className="content-panel">
          <h2>
            Consultation · TZS 50,000 <span className="fee-usd">≈ USD 20</span>
          </h2>
          <p>
            Pay once, then upload your receipt in your workspace. Follow-up questions and further meeting
            requests are included.
          </p>
          <div className="mt-6">
            <Button asChild>
              <Link href="/consultation">Start consultation</Link>
            </Button>
          </div>
        </section>
        <section className="content-panel">
          <h2>Scholarship package</h2>
          <p>
            Your advisor shares the exact ISG fee, included support and any university or provider fees in
            your application. The consultation fee is separate.
          </p>
        </section>
      </div>
    </>
  );
}
