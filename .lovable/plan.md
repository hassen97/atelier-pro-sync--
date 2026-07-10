## What's happening

The health-alert emails ("⚠️ 1 requête(s) lente(s) (> 5s) • PID 904891 — 10199.48s") are a **false alarm**. The flagged "slow query" is Supabase Realtime's logical-replication connection:

```text
START_REPLICATION SLOT supabase_realtime_messages_replication_slot_...
backend_type = walsender   state = active   wait_event = WalSenderWaitForWal
```

This walsender is a long-lived streaming connection that powers the app's realtime features. It is permanently in the `active` state (by design), so its "duration" grows to hours. The `detect_health_issues` DB function only checks `state = 'active'` and duration > threshold — it does not exclude replication/background backends, so it mistakes this healthy connection for a runaway query and alerts every run (throttled to ~1 email per 30-min cooldown).

Real database health is normal: memory 42%, disk 45%, connections 10/60, 0 restarts, no genuinely long-running client queries, no replication-slot bloat.

## The fix

Update the `detect_health_issues` function (via migration) so the slow-query detection only considers real client/application queries and ignores replication, vacuum, and other background backends.

Add to the slow-query subquery:

```text
AND a.backend_type = 'client backend'
AND a.query NOT ILIKE 'START_REPLICATION%'
```

Everything else in the function stays the same, so genuine slow app queries are still detected and the bloat check is untouched.

## After the change

- No code redeploy needed — `system-health-monitor` calls the function through RPC, so the corrected logic takes effect on the next scheduled run.
- The recurring false alerts stop; you'll only get emails for actual slow client queries or table bloat.

## Technical detail

- One migration: `CREATE OR REPLACE FUNCTION public.detect_health_issues(...)` with the two added `WHERE` conditions in the `v_slow` subquery. Same signature, `SECURITY DEFINER`, and `search_path` as the current definition.
- Optional (not required): also skip the `WalSenderWaitForWal` wait_event, but filtering on `backend_type = 'client backend'` already fully covers this case.
