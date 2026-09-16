---
kind: logging_system
name: Console-Only Frontend Logging with No Centralized Logger
category: logging_system
scope:
    - '**'
source_files:
    - src/components/RouteErrorBoundary.tsx
    - src/lib/swUpdate.ts
    - src/contexts/AuthContext.tsx
    - supabase/functions/system-health-monitor/index.ts
---

## What system/approach is used

The RepairPro monorepo does **not** implement a centralized logging framework. The frontend (React/Vite SPA under `src/`) logs exclusively via the browser's native `console` API (`console.log`, `console.warn`, `console.error`). There is no logger library, no structured log formatter, no log-level configuration, and no transport to an external sink (e.g., Sentry, LogRocket). Errors are surfaced through React error boundaries (`RouteErrorBoundary.tsx`) which rethrow to the console and render a user-facing fallback UI.

Supabase Edge Functions (Deno) do not use any logging library either — they return JSON responses and rely on Supabase's built-in function logs for runtime diagnostics. One exception is the `system-health-monitor` function, which persists operational telemetry into the database (`health_alert_log`, `platform_settings`) rather than emitting logs.

## Key files and packages

- `src/components/RouteErrorBoundary.tsx` — single React error boundary; catches render and lazy-chunk-load errors and calls `console.error("[RouteErrorBoundary]", error)` before showing a recoverable UI.
- `src/lib/swUpdate.ts` — service-worker update logic; emits `console.log("[PWA] Service Worker registered", ...)` and `console.warn("[PWA] Service Worker registration failed", err)`.
- `src/contexts/AuthContext.tsx` — uses `console.log("[Auth] ...")` for auth flow tracing.
- All other hooks and components (e.g. `useBackup.ts`, `useCustomers.ts`, `useExpenses.ts`, `useEmployeeTransactions.ts`, `AdminSettingsView.tsx`, `OnboardingRemindersAdminCard.tsx`, etc.) call `console.error` directly at the point of failure.
- `supabase/functions/system-health-monitor/index.ts` — the only backend-side "logging" that writes structured records to the `health_alert_log` table and updates `platform_settings.health_last_check_at` as a heartbeat.

## Architecture and conventions

- **No shared logger module.** There is no `src/lib/logger.ts` or equivalent; every file imports nothing and calls `console.*` directly.
- **Tagged messages.** When developers do log, they prefix messages with a bracketed tag identifying the source, e.g. `[Auth]`, `[PWA]`, `[RouteErrorBoundary]`, `[useAdminSignupNotifier]`, `[sendTestAlert]`. This is the de facto convention for distinguishing log sources in raw console output.
- **Level usage is ad hoc.** `console.error` is used for failures; `console.log` for informational traces (auth flow, PWA registration); `console.warn` sparingly (e.g. PWA registration failure). There is no programmatic level filtering — all levels go to the browser console.
- **Structured fields are absent.** Logs are plain strings concatenated with the error object; there is no JSON payload, no correlation IDs, no request context attached.
- **Backend health telemetry is persisted, not logged.** The `system-health-monitor` Edge Function writes rows to `health_alert_log` (fields: `is_test`, `had_issues`, `slow_count`, `bloat_count`, `webhook_sent`, `email_queued`, `summary`) and updates `platform_settings.health_last_check_at` as a heartbeat. Alerts are also fanned out to a webhook URL and an email queue (`enqueue_email` RPC), but these are alerting channels, not general-purpose logs.

## Conventions and constraints

- **Frontend logging is unstructured and local-only.** Every `console.*` call writes to the browser developer console; nothing is shipped to a remote collector from the SPA code observed here.
- **Errors are caught locally and re-thrown to the console.** The `RouteErrorBoundary` preserves stack traces by passing the full error object to `console.error`; it does not swallow them silently.
- **Service-worker activity is logged at the top of the SW lifecycle.** Registration success/failure is emitted once during `registerServiceWorker()` so deployment issues can be spotted in the console.
- **Health monitoring is opt-in and config-driven.** The health monitor only sends alerts when `platform_settings.health_alerts_enabled === "true"`; otherwise it still inserts a `health_alert_log` row documenting execution, providing a passive heartbeat.
- **No lint rule enforces logging style.** The repository has no ESLint rule visible that mandates or forbids `console.*` usage; the pattern is purely conventional across the codebase.