import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMessages } from "@/lib/i18n/server";
export async function Cta() {
  const { home: h, ui: t } = await getMessages();
  return (
    <section className="cta-section container">
      <div>
        <h2>
          {h.ctaTitle}
        </h2>
        <p>{h.ctaText}</p>
      </div>
      <Button asChild>
        <Link href="/consultation">
          {t.myEligibility} <ArrowUpRight size={19} />
        </Link>
      </Button>
    </section>
  );
}
