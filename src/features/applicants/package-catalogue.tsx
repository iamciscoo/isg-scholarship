import Link from "next/link";
import { ActionForm } from "@/components/forms/action-form";
import { proposalSchema } from "@/lib/validation/opportunities";
import { createClient } from "@/lib/supabase/server";
import { selectPackage } from "./tracking-actions";

export async function PackageCatalogue({ applicant }: { applicant: string }) {
  const db = await createClient();
  const [consultation, catalogue] = await Promise.all([
    db.from("consultation_cases").select("user_id").eq("user_id", applicant).maybeSingle(),
    db.rpc("browse_scholarship_packages"),
  ]);
  if (consultation.error || catalogue.error) throw Error("Scholarship packages unavailable");
  return (
    <section className="workspace-panel">
      <h2>Explore scholarship packages</h2>
      {!consultation.data ? (
        <p>
          <Link className="text-link" href="/consultation">
            Submit a consultation
          </Link>{" "}
          to browse packages and save your interests.
        </p>
      ) : !catalogue.data?.length ? (
        <p>No new packages are available to explore.</p>
      ) : (
        <div className="operation-grid">
          {catalogue.data.map(({ id, proposal }: { id: string; proposal: unknown }) => {
            const { data: info } = proposalSchema.safeParse(proposal);
            if (!info || info.packageFee === undefined) return null;
            return (
              <article className="operation-card" key={id}>
                <h3>{info.name}</h3>
                <p>
                  {info.provider} · {info.destination} · {info.studyLevel}
                </p>
                <p>
                  ISG package fee · <strong>TZS {info.packageFee.toLocaleString("en")}</strong>
                </p>
                {info.supportSummary && <p>{info.supportSummary}</p>}
                <ActionForm action={selectPackage} label="I’m interested">
                  <input name="package" type="hidden" value={id} />
                </ActionForm>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
