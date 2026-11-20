import { createClient } from "@/lib/supabase/server";
import { usdLabel } from "@/lib/format";

export async function PreviousPackageQuote({ user }: { user: string }) {
  const db = await createClient();
  const { data, error } = await db
    .from("service_orders")
    .select("package_name,package_description,gross_tzs,consultation_credit_tzs,remaining_tzs,accepted_at")
    .eq("user_id", user)
    .maybeSingle();
  if (error) throw Error("Previous package quote unavailable");
  if (!data) return null;

  return (
    <section className="workspace-panel">
      <details className="package-gallery">
        <summary>Previously accepted quote</summary>
        <h2>{data.package_name}</h2>
        <p>{data.package_description}</p>
        <p>Accepted {new Date(data.accepted_at).toLocaleDateString("en-GB")}</p>
        <p>
          Original fee · TZS {data.gross_tzs.toLocaleString("en")} <small>{usdLabel(data.gross_tzs)}</small>
        </p>
        <p>
          Credit on this quote · TZS {data.consultation_credit_tzs.toLocaleString("en")}{" "}
          <small>{usdLabel(data.consultation_credit_tzs)}</small>
        </p>
        <strong>
          Agreed fee after credit · TZS {data.remaining_tzs.toLocaleString("en")}{" "}
          <small>{usdLabel(data.remaining_tzs)}</small>
        </strong>
      </details>
    </section>
  );
}
