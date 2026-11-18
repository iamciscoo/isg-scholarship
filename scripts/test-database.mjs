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
  const files = [
    "tests/fixtures/database-bootstrap.sql",
    ...migrations.filter((f) => f < "202611180010").map((f) => `supabase/migrations/${f}`),
    "tests/integration/database.sql",
    "tests/integration/account-updates.sql",
    "tests/integration/roles-and-alerts.sql",
    ...migrations.filter((f) => f >= "202611180010").map((f) => `supabase/migrations/${f}`),
    "tests/integration/consultations.sql",
    "tests/integration/draft-sync.sql",
    "tests/integration/advisor-directory.sql",
    "tests/integration/payments.sql",
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
