import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
export function Cta() {
  return (
    <section className="cta-section container">
      <div>
        <span className="eyebrow">A world of possibility</span>
        <h2>
          Your next chapter
          <br />
          starts with a conversation.
        </h2>
        <p>Bring your ambition. We’ll help you understand the path ahead.</p>
      </div>
      <Button asChild>
        <Link href="/eligibility">
          Check my eligibility <ArrowUpRight size={19} />
        </Link>
      </Button>
    </section>
  );
}
