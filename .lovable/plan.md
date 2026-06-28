# Performance Fix: Login & Tracking-Page Slowdowns

## What happened this morning
The backend itself was healthy (low connections, normal memory, no restarts), so this was **not** an outage or a capacity problem. The slowdown came from **database queries doing full-table scans** because the busiest tables have no indexes on the columns every query filters by. During the morning rush (many owners logging in at once + their customers opening tracking links), those scans pile up and requests crawl — exactly the "login is stuck" / "tracking page keeps loading" symptom.

This was confirmed against the live database with real query plans:

```text
products  WHERE user_id = ...            -> Seq Scan, 81 ms   (no user_id index)
repair_status_history WHERE repair_id=.. -> Seq Scan          (no repair_id index)
```

The `repair_status_history` scan is the key one for the **public tracking page**: it runs inside the `get_repair_by_token` function, so every customer who opens a tracking link forces a full scan of that table.

## Root cause
The hot tables only have primary-key indexes. They are missing indexes on the foreign-key / owner columns used in every read:

| Table | Missing index | Used by |
|-------|---------------|---------|
| `repair_status_history` | `repair_id` | Public tracking page (RPC) |
| `products` | `user_id` | POS, Inventory, Dashboard |
| `repairs` | `user_id`, `customer_id` | Repairs list, Dashboard |
| `sales` | `user_id` | POS, Profit, Dashboard |
| `customers` | `user_id` | Customers, CRM lookups |
| `expenses` | `user_id` | Expenses, Profit |
| `shop_subscriptions` | `user_id` | Login funnel guard (ProtectedRoute) |
| `repair_payments` | `repair_id`, `user_id` | Repairs, Profit |

## Plan

### 1. Add the missing indexes (database migration)
Create btree indexes on each owner/foreign-key column listed above (composite where the query also sorts, e.g. `products(user_id, name)`, `repairs(user_id, created_at desc)`). This turns the sequential scans into index lookups and is the single highest-impact fix. Indexes are additive and safe — no data or behavior changes.

### 2. Reduce redundant query churn during login
- `useOnboardingStatus` in `ProtectedRoute.tsx` currently uses `staleTime: 0`, so its three gating queries (`user_roles`, `shop_settings`, `shop_subscriptions`) re-run on **every** navigation. Give it a short `staleTime` (e.g. 30s) so the login funnel check isn't re-fetched on each page change.
- `usePresence` writes `last_online_at` very frequently (it was the #2 query by total time). Increase the throttle/interval so presence updates don't compete with real reads during the morning rush.

### 3. Verify
Re-run the live query plans after the indexes are created to confirm `Index Scan` replaces `Seq Scan` on `products`, `repair_status_history`, and `shop_subscriptions`, and confirm the tracking RPC is fast.

## Important note about reaching production
The live database is currently **behind** on migrations (e.g. the recent `register_sessions` work exists in the test backend but not in Live). That means these index fixes — like all backend changes — **only reach your customers after a successful Publish**. The earlier "Publishing failed" issue must be resolved (the bundle-splitting work we did should help) so this fix actually lands on the live site. I'll flag if publish still fails after these changes.

## Technical details
- Indexes created with plain `CREATE INDEX IF NOT EXISTS` inside a migration (not `CONCURRENTLY`, which can't run in a migration transaction). Table sizes are small, so creation is instant.
- No RLS, schema, or app-logic changes beyond the two client-side caching/throttle tweaks in step 2.
- No changes to the Returns/RMA module or any frozen systems.
