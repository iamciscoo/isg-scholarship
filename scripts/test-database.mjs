import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
const owner = randomUUID();
const name = `isg-security-test-${process.pid}`;
function docker(args, input) {
  const r = spawnSync("docker", args, { input, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
  if (r.status !== 0) throw new Error((r.stderr || r.stdout || "Docker command failed").trim());
  return r.stdout.trim();
}
try {
  docker([
    "run",
    "-d",
    "--name",
    name,
    "--label",
    `isg.test.owner=${owner}`,
    "-e",
    `POSTGRES_PASSWORD=${randomUUID()}`,
    "postgres:17-alpine",
  ]);
  let ready = false;
  for (let i = 0; i < 60; i++) {
    const r = spawnSync("docker", ["exec", name, "pg_isready", "-h", "127.0.0.1", "-U", "postgres"], {
      encoding: "utf8",
    });
    if (r.status === 0) {
      ready = true;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (!ready) throw new Error("Test PostgreSQL did not become ready.");
  const migrations = readdirSync("supabase/migrations")
    .filter((f) => f.endsWith(".sql"))
    .sort();
  const advisorFlow = migrations.findIndex((file) => file.endsWith("_advisor_assignment_flow.sql"));
  if (advisorFlow < 0) throw new Error("Advisor flow migration is missing.");
  const files = [
    "tests/fixtures/database-bootstrap.sql",
    ...migrations.filter((f) => f < "202611180010").map((f) => `supabase/migrations/${f}`),
    "tests/integration/database.sql",
    "tests/integration/account-updates.sql",
    "tests/integration/roles-and-alerts.sql",
    ...migrations
      .filter((f) => f >= "202611180010" && f < "20261119222344")
      .map((f) => `supabase/migrations/${f}`),
    "tests/integration/consultations.sql",
    "tests/integration/draft-sync.sql",
    "tests/integration/advisor-directory.sql",
    "tests/integration/payments.sql",
    "tests/integration/meetings-and-forms.sql",
    "tests/integration/applications.sql",
    "tests/integration/marketing-images.sql",
    "tests/integration/staff-inbox.sql",
    ...migrations
      .slice(0, advisorFlow)
      .filter((f) => f >= "20261119222344")
      .map((f) => `supabase/migrations/${f}`),
    "tests/integration/scholarship-packages.sql",
    ...migrations
      .slice(advisorFlow)
      .filter((f) => f < "202611220051")
      .map((f) => `supabase/migrations/${f}`),
    "tests/integration/notification-delivery.sql",
    "tests/integration/advisor-package-flow.sql",
    "tests/integration/case-uploads.sql",
    "tests/integration/application-review.sql",
    "tests/integration/consultation-workflow.sql",
    ...migrations.filter((f) => f >= "202611220051" && f < "202611230055").map((f) => `supabase/migrations/${f}`),
    "tests/integration/notification-resolution-legacy.sql",
    ...migrations.filter((f) => f >= "202611230055").map((f) => `supabase/migrations/${f}`),
    "tests/integration/admin-led-workflow.sql",
    "tests/integration/staff-application-entry.sql",
    "tests/integration/admin-receipt-uploads.sql",
    "tests/integration/notification-resolution.sql",
    "tests/integration/managed-programmes.sql",
    "tests/integration/workflow-delivery.sql",
    "tests/integration/admin-notification-email.sql",
    "scripts/reset-consultations-and-packages.sql",
    "tests/integration/consultation-reset.sql",
  ];
  for (const file of files) {
    docker(
      ["exec", "-i", name, "psql", "-U", "postgres", "-v", "ON_ERROR_STOP=1"],
      readFileSync(file, "utf8"),
    );
    console.log(`Passed: ${file}`);
  }
  console.log("Database migrations and adversarial RLS tests passed.");
} catch (err) {
  console.error(err.message);
  process.exitCode = 1;
} finally {
  const check = spawnSync(
    "docker",
    ["inspect", "--format", '{{index .Config.Labels "isg.test.owner"}}', name],
    { encoding: "utf8" },
  );
  if (check.status === 0 && check.stdout.trim() === owner) docker(["rm", "-f", name]);
}
