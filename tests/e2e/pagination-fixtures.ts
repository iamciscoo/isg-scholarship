import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

export async function seedPagination(data: Record<string, unknown>) {
  const url = process.env.ISG_QA_URL!;
  if (process.env.ISG_WORKFLOW_QA !== "true" || !/^(localhost|127\.0\.0\.1)$/.test(new URL(url).hostname))
    throw Error("Local QA only");
  const service = createClient(url, process.env.ISG_QA_KEY!);
  const staff = createClient(url, process.env.ISG_QA_ANON_KEY!);
  const signedIn = await staff.auth.signInWithPassword({
    email: "isg-qa-admin@example.com",
    password: process.env.ISG_WORKFLOW_QA_PASSWORD!,
  });
  if (signedIn.error) throw signedIn.error;
  const users = await service.auth.admin.listUsers({ perPage: 1000 });
  if (users.error) throw users.error;
  const packageRow = await service.from("study_applications").select("opportunity_id").limit(1).single();
  if (packageRow.error) throw packageRow.error;
  for (let index = 1; index <= 21; index++) {
    const email = `isg-qa-pagination-${index}@example.com`;
    let user = users.data.users.find((user) => user.email === email);
    if (!user) {
      const created = await service.auth.admin.createUser({ email, email_confirm: true });
      if (created.error) throw created.error;
      user = created.data.user;
    }
    const submitted = await service.rpc("submit_my_consultation", {
      p_user: user.id,
      p_key: randomUUID(),
      p_hash: `pagination-${index}`,
      p_team_email: "",
      p_data: { ...data, email, firstName: `QA ${index}`, lastName: "Pagination" },
    });
    if (submitted.error) throw submitted.error;
    const verified = await service
      .from("consultation_cases")
      .update({ payment_status: "verified", verified_at: new Date().toISOString() })
      .eq("user_id", user.id);
    if (verified.error) throw verified.error;
    const assigned = await staff.rpc("propose_application", {
      p_user: user.id,
      p_opportunity: packageRow.data.opportunity_id,
    });
    if (assigned.error) throw assigned.error;
  }
}
