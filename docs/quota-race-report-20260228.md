**Quota race test — summary**

- Date: 2026-02-28
- Test: `tests/stress/quota-race.test.js` with 50 simulated users (25 returning / 25 new)
- Purpose: Validate dual-pool capacity rules, 2-ticket lock behavior, advisory locking and race-safety under concurrent load.

**Actions performed**
- Diagnosed Supabase Auth 500 error caused by NULL `confirmation_token` in `auth.users`.
- Backed up `auth.users` to `public.auth_users_backup_mcp` via MCP migration.
- Replaced NULL `confirmation_token` values with empty string (safe update) via MCP migration.
- Exported RPC source to `public.rpc_function_defs` and inspected `check_and_lock_slot`, `submit_application`, `get_ticket_stats`.
- Seeded whitelist and ran stress test (50 users).

**Key findings**
- The NULL→string scan error in `auth.users` was the root cause of admin endpoints returning HTTP 500; fixing it restored admin API functionality.
- RPC implementations (in DB functions) correctly implement:
  - 2-ticket speculative locks (`ticket_count = 2`) at lock time.
  - 20% phantom lock buffer to avoid lock exhaustion.
  - Dual asil pools (returning/new) with separate capacities (defaults: 400 and 300).
  - Advisory locking via `pg_advisory_xact_lock(hashtext('dpg_quota_lock'))` to enforce atomicity.
- Runtime test (50 users) results: all 50 locks succeeded and 50 submissions completed; no pool exceeded its capacity.

**Artifacts**
- Raw test log: `tests/stress/reports/quota-race-50users-20260228.txt`
- Exported RPC definitions: `public.rpc_function_defs` (queried via `tests/stress/fetch-rpc-defs.js`)
- Backup of `auth.users` created: `public.auth_users_backup_mcp`

**Next steps (optional)**
- Run larger stress tests to exercise boundary conditions (e.g., > asil capacity) and observe `yedek` behavior.
- Harden DB functions to avoid relying on non-nullable assumptions in Auth API (defensive null handling).
- Send summary to Supabase support if the initial NULL scan error recurs.

