# God Mode — System Health Dashboard

A new **"Santé Système"** view inside the existing Ultra Admin panel that monitors database size, bloat, connections, and currently-running slow queries, plus a global maintenance-mode flag. Access is restricted to `platform_admin` users at both the database (function-level) and UI layers.

Decisions confirmed: integrated admin **view** (not a standalone route), maintenance mode is **flag-only** (stored, no user blocking yet), and the UI shows **real data only** (no mock fallback).

---

## Phase 1 — Backend (Supabase RPCs & security)

One migration creating four `SECURITY DEFINER` functions, each gated so only platform admins can run them. They run as the `postgres` owner, which can read the `pg_stat_*` catalogs, while a `has_role(auth.uid(), 'platform_admin')` guard blocks everyone else (raises an exception for non-admins).

1. **`get_db_table_sizes()`** — joins `pg_stat_user_tables` with `pg_total_relation_size()`; returns per table: `table_name`, `total_size_mb` (numeric), `live_tuples`, `dead_tuples`, and `dead_ratio` (dead / (live+dead) as a percentage). Ordered by size descending.
2. **`get_active_connections()`** — from `pg_stat_activity`: returns `total`, `active`, and `idle` connection counts (scoped to the current database).
3. **`get_slow_queries()`** — from `pg_stat_activity`: returns rows where `state = 'active'` and `now() - query_start > interval '1 second'`, excluding the function's own query. Returns `pid`, `duration_seconds`, truncated `query` text, and `state`.
4. **Maintenance mode** — insert a `maintenance_mode` row into the existing key-value `platform_settings` table (`key='maintenance_mode'`, `value='false'`), matching the existing `safe_mode_enabled` convention. No schema column change needed.

`GRANT EXECUTE` on the three metric functions to `authenticated` (the in-function role check is the real gate). `platform_settings` already has working policies.

## Phase 2 — Frontend UI (React + Recharts)

**New view component** `src/components/admin/AdminSystemHealthView.tsx`, rendered inside `AdminDashboard.tsx` and reachable from `AdminSidebar.tsx` under the **"Système"** section (new id `system_health`, label "Santé Système", `Activity`/`HeartPulse` icon). God Mode dark aesthetic consistent with the existing admin shell (`admin-glass-card`, neon accents).

- **Metric cards grid** (reusing `AdminStatCard`): Active Connections, Total DB Size (sum of table sizes), and a derived **System Status** badge — Healthy / Warning / Critical computed from connection count, total size, and presence of slow queries.
- **Storage Radar** — `recharts` `BarChart` of the **top 5** largest tables (size in MB) from `get_db_table_sizes`.
- **Bloat Warning table** — all tables with size, live/dead tuples, and dead ratio; rows with `dead_ratio > 20%` highlighted in red.
- **Danger Zone card** — a `Switch` for "Activer le Mode Maintenance Global" that reads/writes the `maintenance_mode` row in `platform_settings` (flag only; confirmation toast on change).

## Phase 3 — Data fetching & polling

**New hook** `src/hooks/useSystemHealth.ts` using `@tanstack/react-query`:
- `useDbTableSizes()` — `staleTime` ~60s (sizes change slowly).
- `useActiveConnections()` and `useSlowQueries()` — `refetchInterval: 30000` so they auto-poll every 30s. React Query unmounts the interval automatically when the view changes, so no manual cleanup/memory leaks.
- `useMaintenanceMode()` query + `useSetMaintenanceMode()` mutation invalidating its key.

All hooks call `supabase.rpc(...)`. Errors surface as an inline "métrique indisponible" state per card/section.

## Phase 4 — Testing & validation

- Run the migration and confirm the four functions compile without SQL errors.
- Verify each RPC returns data (and that a non-admin call is rejected) via a read query / direct invocation.
- Confirm the view handles loading and error/empty states gracefully (skeletons + fallback text), and that the bar chart maps the RPC JSON correctly.
- Typecheck the new components/hook.

---

## Technical notes

- Role guard uses the existing `platform_admin` app_role and `has_role()` security-definer function — consistent with the rest of the codebase. The user's word "admin" maps to `platform_admin` here.
- No standalone `/admin/system-health` route: `ProtectedRoute` force-redirects platform admins to `/admin`, so the metric view is registered in the `AdminView` union, the sidebar, and the `AdminDashboard` content switch — the same pattern as every other admin screen.
- `platform_settings` stays key-value; `maintenance_mode` is just another row.
- Functions are `SECURITY DEFINER` with `SET search_path = public, pg_catalog` and an explicit admin check that raises on unauthorized callers.

## Files

- **Migration** (new): four functions + `maintenance_mode` seed row.
- `src/hooks/useSystemHealth.ts` (new): query/mutation hooks with 30s polling.
- `src/components/admin/AdminSystemHealthView.tsx` (new): the dashboard UI.
- `src/components/admin/AdminSidebar.tsx`: add nav item + `system_health` to the `AdminView` union.
- `src/pages/AdminDashboard.tsx`: add `system_health` to the union, `viewLabels`, and the content switch.
