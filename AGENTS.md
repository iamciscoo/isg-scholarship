<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Supabase and browser access

Use the configured Supabase MCP server for Supabase and SQL work on this project. Use `execute_sql`, `apply_migration`, `list_tables`, and `get_advisors` as appropriate. If the server is unavailable, report the connection error.

Use Chrome or other browser automation only when the user explicitly requests UI work. Never read SQL results from a web page.
