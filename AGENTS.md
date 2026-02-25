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
- `VITE_ADMIN_PASSWORD` — password for the admin panel (`/admin/login`)

The `.env` file is gitignored. If these secrets are set as environment variables (e.g. via Cursor Secrets), the `.env` file is created automatically during setup. Without real Supabase credentials the frontend loads and admin login works, but data-dependent features (whitelist, submissions, dashboard stats) will fail.

### Linting / Testing
No ESLint config or test framework is currently configured in this repo. There are no `lint` or `test` npm scripts.

### Key routes
| Route | Description |
|---|---|
| `/` | Public landing page |
| `/apply` | Dynamic application form |
| `/admin/login` | Admin password login |
| `/admin` | Admin dashboard (protected) |
| `/admin/whitelist` | Whitelist management |
| `/admin/submissions` | Application submissions |
| `/admin/communication` | Communication manager |
| `/admin/email-templates` | Email template editor |
| `/admin/quota` | Quota settings |

### Gotchas
- Node.js 20 is required (pinned in `.nvmrc` and `package.json` engines).
- Admin auth is client-side only — `sessionStorage` key `dpg_admin_authenticated` is set on successful login.
- The Supabase client (`src/lib/supabase.js`) will throw if `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` are undefined, but the app still renders the public page.
