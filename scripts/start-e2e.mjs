import { spawn, spawnSync } from "node:child_process";
import { cpSync } from "node:fs";
// Exercise a real production build, isolated from local credentials and the active dev server.
const env = {
  ...process.env,
  NEXT_DIST_DIR: ".next-e2e",
  NEXT_PUBLIC_SITE_URL: "http://localhost:3004",
  NEXT_PUBLIC_SUPABASE_URL: "",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
  SUPABASE_SERVICE_ROLE_KEY: "",
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: "",
  TURNSTILE_SECRET_KEY: "",
  RESEND_API_KEY: "",
  INTAKE_ENABLED: "false",
  NEXT_TELEMETRY_DISABLED: "1",
};
const next = "node_modules/next/dist/bin/next";
const build = spawnSync(process.execPath, [next, "build"], { env, stdio: "inherit" });
if (build.status !== 0) process.exit(build.status || 1);
cpSync("public", ".next-e2e/standalone/public", { recursive: true });
cpSync(".next-e2e/static", ".next-e2e/standalone/.next-e2e/static", { recursive: true });
const server = spawn(process.execPath, [".next-e2e/standalone/server.js"], {
  env: { ...env, PORT: "3004", HOSTNAME: "127.0.0.1" },
  stdio: "inherit",
});
for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => server.kill(signal));
server.on("exit", (code) => process.exit(code || 0));
