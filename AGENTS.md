# AGENTS.md

## Cursor Cloud specific instructions

### Project overview
TALPA DPG 2026 — a React SPA (Vite + Tailwind CSS) for the Turkish Airline Pilots Association's "World Pilots' Day 2026" event registration and management system. Supabase is the sole backend (PostgreSQL, RLS, RPCs).

### Running the dev server
```
npm run dev
```
Starts Vite on port 5173 by default. Use `--host 0.0.0.0` flag to expose on all interfaces.

### Building
```
npm run build
```

### Environment variables
A `.env` file is required at the repo root with:
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anonymous API key

The `.env` file is gitignored. If these secrets are set as environment variables (e.g. via Cursor Secrets), the `.env` file is created automatically during setup. Without real Supabase credentials the frontend loads but data-dependent features (whitelist, submissions, dashboard stats) will fail.

Admin login uses **Supabase Auth** (email+password). The admin user `dpg@talpa.org` is pre-created in the Supabase Auth table.

### Linting / Testing
No ESLint config or test framework is currently configured in this repo. There are no `lint` or `test` npm scripts.

### Key routes
| Route | Description |
|---|---|
| `/` | Public landing page |
| `/apply` | Disabled — redirects to `/` |
| `/admin/login` | Admin Supabase Auth login |
| `/admin` | Admin dashboard (protected) |
| `/admin/whitelist` | Whitelist management |
| `/admin/submissions` | Application submissions |
| `/admin/communication` | Communication manager |
| `/admin/email-templates` | Email template editor |
| `/admin/quota` | Quota settings |

### .env file setup for Cloud Agents
When Cursor Secrets (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) are injected as environment variables, write them to `.env` before starting the dev server:
```bash
echo "VITE_SUPABASE_URL=${VITE_SUPABASE_URL}" > .env
echo "VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}" >> .env
```
Vite reads `VITE_*` vars from `.env` at startup — changing the file requires a dev server restart to take effect.

### Gotchas
- Node.js 20 is required (pinned in `.nvmrc` and `package.json` engines).
- Admin auth uses Supabase Auth (`signInWithPassword`). The `ProtectedRoute` component checks active session via `supabase.auth.getSession()`.
- The Supabase client (`src/lib/supabase.js`) returns `null` if `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` are undefined, but the app still renders the public page.
- The Supabase anon key provided via secrets is a publishable key (safe for client-side use).
- Route-level code splitting is active — all pages are lazy-loaded via `React.lazy()`.
