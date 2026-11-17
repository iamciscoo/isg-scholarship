import { cpSync } from "node:fs";
import { spawn } from "node:child_process";
cpSync("public", ".next/standalone/public", { recursive: true });
cpSync(".next/static", ".next/standalone/.next/static", { recursive: true });
const child = spawn(process.execPath, [".next/standalone/server.js"], {
  env: { ...process.env, PORT: process.env.PORT || "3002", HOSTNAME: process.env.HOSTNAME || "127.0.0.1" },
  stdio: "inherit",
});
for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code || 0));
