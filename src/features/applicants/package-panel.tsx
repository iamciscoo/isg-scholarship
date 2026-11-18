import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/forms/action-form";
import { acceptPackage } from "./tracking-actions";
export async function PackagePanel({ user }: { user: string }) {
  const db = await createClient();
  const [orders, packages] = await Promise.all([
    db
      .from("service_orders")
      .select(
        "id,package_name,package_description,gross_tzs,consultation_credit_tzs,remaining_tzs,accepted_at",
      )
      .eq("user_id", user)
      .maybeSingle(),
    db
      .from("service_packages")
      .select("id,name,description,price_tzs,updated_at")
      .eq("active", true)
      .eq("promoted", true)
      .order("price_tzs"),
  ]);
  if (orders.error || packages.error) throw Error("Package quotes unavailable");
  return (
    <section className="workspace-panel">
      <h2>Your ISG service package</h2>
      <p>
        ISG service fees are separate from provider, university, visa, insurance and travel charges. Your
        verified TZS 50,000 consultation payment is credited once toward your ISG package.
      </p>
      {orders.data ? (
        <div className="operation-card">
          <h3>{orders.data.package_name}</h3>
          <p>{orders.data.package_description}</p>
          <p>ISG package: TZS {orders.data.gross_tzs.toLocaleString("en")}</p>
          <p>Consultation credit: − TZS {orders.data.consultation_credit_tzs.toLocaleString("en")}</p>
          <strong>Remaining ISG fee: TZS {orders.data.remaining_tzs.toLocaleString("en")}</strong>
          <p>
            This is your accepted quote. The remaining balance is not marked paid automatically. Provider
            charges are quoted separately for each proposed opportunity.
          </p>
        </div>
      ) : !packages.data?.length ? (
        <p>Your advisor will explain the package options when ISG publishes the current prices.</p>
      ) : (
        <div className="operation-grid">
          {packages.data.map((p) => (
            <article className="operation-card" key={p.id}>
              <h3>{p.name}</h3>
              <p>{p.description}</p>
              <p>ISG fee: TZS {p.price_tzs.toLocaleString("en")}</p>
              <p>After consultation credit: TZS {(p.price_tzs - 50000).toLocaleString("en")}</p>
              <ActionForm action={acceptPackage} label="Accept package quote">
                <input name="package" type="hidden" value={p.id} />
                <input name="quoteUpdatedAt" type="hidden" value={p.updated_at} />
                <label className="checkbox-field">
                  <input name="confirm" type="checkbox" required />I accept this ISG package price and scope
                  and understand that provider fees are separate. My consultation credit is applied once.
                </label>
              </ActionForm>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
