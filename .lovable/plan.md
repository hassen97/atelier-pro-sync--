# God Mode — Alerts, Emergency Maintenance & Maintenance Mode

Three capabilities layered onto the existing "Santé Système" admin view:

1. **Automatic alerts** (email + webhook) when slow queries or dead-tuple bloat cross configurable thresholds.
2. **Manual emergency action** to run `VACUUM ANALYZE` or `ANALYZE` (admin chooses per run) on a bloated table directly from the dashboard.
3. **Enforced maintenance mode** — when ON, only platform admins can use the app; everyone else sees a full maintenance page.

Defaults (no value was given, so these are seeded and editable in the dashboard): slow query **> 5s**, dead-tuple ratio **> 30%**, and a minimum table size of **50 MB** so tiny tables don't generate noise.

---

## Phase 1 — Backend (database)

One migration adding:

- **`detect_health_issues(slow_threshold_s, bloat_ratio, min_size_mb)`** — `SECURITY DEFINER`, returns JSON `{ slow_queries: [...], bloated_tables: [...] }`. Authorization: allowed when `auth.uid()` is a `platform_admin` **or** when `auth.uid()` is null (service-role/cron context); raises otherwise. Granted to `authenticated` and `service_role`. Used by both the cron monitor and the dashboard "test" button.
- **`is_maintenance_mode()`** — `SECURITY DEFINER` returning boolean from the `maintenance_mode` row. Granted to `authenticated` and `anon` so the app can check the flag without exposing the whole `platform_settings` table.
- **Seed `platform_settings` rows** (key-value, matching existing convention): `health_alerts_enabled` (`false`), `health_alert_email` (empty — falls back to existing `admin_notify_email`), `health_alert_webhook_url` (empty), `health_slow_query_threshold_s` (`5`), `health_bloat_ratio_threshold` (`30`), `health_bloat_min_size_mb` (`50`), `health_alert_last_sent_at` (internal dedup).

A generated secret `HEALTH_MONITOR_SECRET` is created so the cron job can authenticate to the monitor function.

## Phase 2 — Edge functions

**`system-health-monitor`** (new)
- Accepts either a platform-admin JWT (dashboard "Tester l'alerte" button) **or** a matching `x-cron-secret` header (cron).
- Reads alert settings, calls `detect_health_issues`, and if any threshold is breached: POSTs a JSON payload to the configured webhook URL (Slack/Discord/custom) **and** sends an email to the alert recipient via the existing email queue (`enqueue_email`), falling back to `admin_notify_email`.
- Dedup: skips re-sending if `health_alert_last_sent_at` is within a cooldown window (e.g. 30 min); updates it on send. Returns a summary so the dashboard test button can report what was triggered.

**`admin-db-maintenance`** (new)
- Requires a platform-admin JWT (same role check pattern as `admin-manage-users`).
- Connects via the `SUPABASE_DB_URL` secret using a Postgres driver (so `VACUUM` runs outside a transaction, which RPC/PostgREST can't do).
- Validates the requested table name against the live list from `pg_stat_user_tables` (whitelist — no string injection) and the requested mode (`vacuum_analyze` | `analyze`), then runs `VACUUM (ANALYZE) <table>` or `ANALYZE <table>`.

**Cron**: a `pg_cron` + `pg_net` job (created via the insert tool since it embeds the project URL + secret) calls `system-health-monitor` every 5 minutes with the `x-cron-secret` header.

## Phase 3 — Frontend

**`src/hooks/useSystemHealth.ts`** — add:
- `useHealthAlertSettings()` query + `useSaveHealthAlertSettings()` mutation (read/write the `platform_settings` rows).
- `useTestHealthAlert()` — invokes `system-health-monitor` with the admin session.
- `useRunMaintenance()` — invokes `admin-db-maintenance` with `{ table, mode }`, then invalidates the table-sizes query so bloat numbers refresh.
- `useMaintenanceModeFlag()` — calls `is_maintenance_mode()` (for the global guard), polled lightly.

**`src/components/admin/AdminSystemHealthView.tsx`**
- New **"Alertes automatiques"** card: enable switch, alert email, webhook URL, three threshold inputs (slow seconds, bloat %, min size MB), Save button, and a "Tester l'alerte" button that surfaces the monitor's result.
- Bloat table: add an actions column with a small dropdown per row — **VACUUM ANALYZE** and **ANALYZE** — with a confirm step and a spinner while running (`useRunMaintenance`). Surfaced on every row but emphasized on bloated (>20%) rows.

**Maintenance enforcement**
- New `src/pages/Maintenance.tsx` — branded full-screen "maintenance en cours" page (dark God Mode aesthetic, sign-out button).
- `src/components/auth/ProtectedRoute.tsx`: after the existing admin check, read `useMaintenanceModeFlag()`. If maintenance is ON and the user is **not** a platform admin, render the maintenance page instead of the requested route. Platform admins pass through unaffected. The flag check is gated so it never delays admin routing.
- The existing maintenance toggle in the "Zone de danger" card stays as the on/off control.

## Phase 4 — Validation

- Run the migration; confirm the two functions compile and `detect_health_issues` returns data for an admin and is rejected for a non-admin.
- Verify `admin-db-maintenance` runs `ANALYZE` on a real table and rejects unknown table names / non-admins.
- Confirm the alert card persists settings and the test button reports webhook/email outcomes.
- Toggle maintenance mode and confirm a non-admin session is routed to the maintenance page while an admin keeps full access.
- Typecheck the changed components/hook.

---

## Technical notes

- `VACUUM` cannot run inside a function or transaction, which is why the emergency action uses a direct DB connection in an edge function rather than an RPC.
- `detect_health_issues` and `is_maintenance_mode` are `SECURITY DEFINER` with explicit `SET search_path` and an in-function authorization check, consistent with the existing `get_db_table_sizes` / `has_role` pattern.
- Alerts reuse the existing email queue and admin notify email so no new email infrastructure is introduced; the webhook is a plain JSON POST.
- Maintenance mode is read through a dedicated `SECURITY DEFINER` boolean function so non-admins can detect it without broad `platform_settings` read access.

## Files

- **Migration** (new): `detect_health_issues`, `is_maintenance_mode`, seed settings rows.
- **Insert** (new): `pg_cron` job for the monitor.
- `supabase/functions/system-health-monitor/index.ts` (new).
- `supabase/functions/admin-db-maintenance/index.ts` (new).
- `src/hooks/useSystemHealth.ts`: alert settings, test, maintenance, run-maintenance hooks.
- `src/components/admin/AdminSystemHealthView.tsx`: alerts card + per-table VACUUM/ANALYZE actions.
- `src/pages/Maintenance.tsx` (new): maintenance page.
- `src/components/auth/ProtectedRoute.tsx`: enforce maintenance mode for non-admins.
- A generated `HEALTH_MONITOR_SECRET` secret.