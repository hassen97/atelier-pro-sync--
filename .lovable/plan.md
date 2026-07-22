
# Performance optimization plan

The DB is small today (~11 MB largest table, ~0 dead tuples) so this is a preventative pass: add the indexes that will matter as data grows, trim the biggest client-side over-fetches, tighten one RLS pattern, and hand you copy-paste maintenance SQL.

## Task 1 — Schema & index optimization

### What's missing today
Audit found **34 unindexed foreign keys** (full list from `pg_constraint`) plus a few missing composite indexes for common `WHERE user_id = ? ORDER BY created_at DESC` patterns. Also found **14 unused indexes** wasting ~500 KB and duplicate coverage on `repair_payments`.

### Migration to add (single file)

```sql
-- Foreign-key indexes (currently unindexed)
CREATE INDEX IF NOT EXISTS idx_announcement_reads_announcement ON public.announcement_reads(announcement_id);
CREATE INDEX IF NOT EXISTS idx_categories_user_id           ON public.categories(user_id);
CREATE INDEX IF NOT EXISTS idx_defective_parts_product      ON public.defective_parts(product_id);
CREATE INDEX IF NOT EXISTS idx_defective_parts_supplier     ON public.defective_parts(supplier_id);
CREATE INDEX IF NOT EXISTS idx_defective_parts_warranty     ON public.defective_parts(warranty_ticket_id);
CREATE INDEX IF NOT EXISTS idx_expenses_supplier            ON public.expenses(supplier_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user                ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer            ON public.invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_repair              ON public.invoices(repair_id);
CREATE INDEX IF NOT EXISTS idx_invoices_sale                ON public.invoices(sale_id);
CREATE INDEX IF NOT EXISTS idx_product_returns_customer     ON public.product_returns(customer_id);
CREATE INDEX IF NOT EXISTS idx_product_returns_product      ON public.product_returns(product_id);
CREATE INDEX IF NOT EXISTS idx_product_returns_sale         ON public.product_returns(sale_id);
CREATE INDEX IF NOT EXISTS idx_product_returns_sale_item    ON public.product_returns(sale_item_id);
CREATE INDEX IF NOT EXISTS idx_products_category            ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_repair_parts_repair          ON public.repair_parts(repair_id);
CREATE INDEX IF NOT EXISTS idx_repair_parts_product         ON public.repair_parts(product_id);
CREATE INDEX IF NOT EXISTS idx_repairs_category             ON public.repairs(category_id);
CREATE INDEX IF NOT EXISTS idx_repairs_warranty_ticket      ON public.repairs(warranty_ticket_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer               ON public.sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale              ON public.sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product           ON public.sale_items(product_id);
CREATE INDEX IF NOT EXISTS idx_shop_subscriptions_plan      ON public.shop_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_subscription_orders_plan     ON public.subscription_orders(plan_id);
CREATE INDEX IF NOT EXISTS idx_supplier_purchases_supplier  ON public.supplier_purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_purchases_product   ON public.supplier_purchases(product_id);
CREATE INDEX IF NOT EXISTS idx_supplier_purchases_tx        ON public.supplier_purchases(transaction_id);
CREATE INDEX IF NOT EXISTS idx_supplier_transactions_sup    ON public.supplier_transactions(supplier_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_user               ON public.suppliers(user_id);
CREATE INDEX IF NOT EXISTS idx_warranty_tickets_original    ON public.warranty_tickets(original_repair_id);
CREATE INDEX IF NOT EXISTS idx_conversations_post           ON public.conversations(post_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation        ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_service     ON public.service_requests(service_id);
CREATE INDEX IF NOT EXISTS idx_plan_feature_flags_flag      ON public.plan_feature_flags(feature_flag_id);

-- Composite indexes for hot list queries (user_id + created_at DESC)
CREATE INDEX IF NOT EXISTS idx_activity_log_user_created   ON public.activity_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_user_created       ON public.invoices(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_user_created       ON public.expenses(user_id, created_at DESC);

-- Drop clearly-unused / duplicate indexes (zero scans, safe to remove)
DROP INDEX IF EXISTS public.idx_repair_payments_repair;      -- duplicate of idx_repair_payments_repair_id
DROP INDEX IF EXISTS public.idx_repair_payments_user;        -- duplicate of idx_repair_payments_user_id
DROP INDEX IF EXISTS public.idx_repair_payments_customer;    -- never scanned
DROP INDEX IF EXISTS public.idx_email_send_log_recipient;    -- never scanned
DROP INDEX IF EXISTS public.idx_unsubscribe_tokens_token;    -- redundant with unique key
```

Kept (even with 0 scans so far): `idx_products_barcodes`, `idx_warranty_tickets_status`, `idx_product_returns_status`, `idx_defective_parts_status`, `idx_customer_vault_customer`, `idx_loyalty_tx_sale`, `idx_employee_transactions_date`, `idx_suppressed_emails_email` — these back rare/admin lookups where seq-scan will get slow with growth.

## Task 2 — Frontend over-fetching fixes

Already paginated (no change): `useRepairs`, `useProducts`, `useCustomers`, `useActivityLog`, `useSales`.

### Real offenders

1. **`useDashboard.ts`** — fetches every row of `sales`, `repairs`, `products`, `customers`, `suppliers`, `product_returns` on every 30-second refetch to compute totals and month-over-month. Fix: aggregate on the DB via a new `dashboard_stats` SQL function (single `SELECT sum(...) FILTER (WHERE ...)`) and change the hook to call `supabase.rpc("dashboard_stats")`. Cuts payload from ~all rows to ~12 numbers.

2. **`useStatistics.ts`, `useProfit.ts`** — same pattern (full-history scans on the client). Move sums/grouping into `stats_range(_from, _to)` and `profit_range(_from, _to)` SQL functions returning per-day/per-category aggregates.

3. **`useCustomerHistory.ts`** — `sales(...sale_items(*))` pulls join blobs; select only the summary columns actually rendered.

4. **`useWarranty.ts`** line 81/170 — loads every warranty-eligible repair. Add `.limit(100)` + status filter, or paginate the drawer.

5. **`useBackup.ts`** — legitimately needs full data for backup; leave as-is but gate behind the existing "download backup" button (already the case).

Deliverables in build phase: 3 new SQL functions + rewrites of the 4 hooks above (dashboard/statistics/profit/customer-history) to consume them. No UI changes.

## Task 3 — RLS review

Most policies use `auth.uid() = user_id` which is indexable and fine. Two patterns are worth tightening:

- Wrap `auth.uid()` in `(SELECT auth.uid())` inside policies — Postgres then evaluates it once per query instead of once per row, unlocking index scans on large tables. Apply to `repairs`, `sales`, `products`, `customers`, `activity_log`, `expenses`, `invoices`.
- `is_team_member(...)` policies that OR in a subquery: keep them, but ensure `team_members(owner_id, member_user_id, status)` has a composite index (it already does via the unique key).

The migration will rewrite the affected policies with `DROP POLICY ... / CREATE POLICY ...` blocks — no behavior change, just planner improvement.

## Task 4 — Maintenance SQL (copy-paste into SQL editor)

```sql
-- 1) Bloat / dead tuples per table
SELECT relname, n_live_tup, n_dead_tup,
       ROUND(n_dead_tup::numeric / NULLIF(n_live_tup + n_dead_tup, 0) * 100, 1) AS dead_pct,
       pg_size_pretty(pg_total_relation_size(relid)) AS total_size
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_dead_tup DESC;

-- 2) Unused indexes (zero scans, safe candidates for DROP)
SELECT s.relname AS table, s.indexrelname AS index,
       pg_size_pretty(pg_relation_size(s.indexrelid)) AS size, s.idx_scan
FROM pg_stat_user_indexes s
WHERE s.schemaname = 'public' AND s.idx_scan = 0
  AND s.indexrelname NOT LIKE '%_pkey'
  AND s.indexrelname NOT LIKE '%_key'
ORDER BY pg_relation_size(s.indexrelid) DESC;

-- 3) Largest tables
SELECT relname,
       pg_size_pretty(pg_total_relation_size(relid)) AS total,
       pg_size_pretty(pg_relation_size(relid))       AS heap,
       pg_size_pretty(pg_indexes_size(relid))        AS indexes
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(relid) DESC
LIMIT 20;

-- 4) Safe cleanup (non-blocking; do NOT wrap in a transaction)
VACUUM (ANALYZE) public.activity_log;
VACUUM (ANALYZE) public.products;
VACUUM (ANALYZE) public.repairs;
VACUUM (ANALYZE) public.shop_subscriptions;
VACUUM (ANALYZE) public.platform_settings;
-- Only when you can tolerate an exclusive lock and want to reclaim disk:
-- VACUUM (FULL, ANALYZE) public.activity_log;
```

## Current-state snapshot (verified this turn)

- DB is healthy: largest table `activity_log` 3.4 MB / 0 dead tuples; total user tables ~11 MB.
- Highest dead-tuple ratios: `platform_settings` (41/17), `shop_subscriptions` (51/139), `register_sessions` (23/426) — small in absolute terms; a single `VACUUM ANALYZE` clears them.
- 14 indexes with 0 scans since boot; migration drops 5 that are duplicates/never-useful and keeps the rest.
- 34 foreign keys currently unindexed — indexes above cover all of them.

## Build-phase deliverables

1. One migration: index additions/drops + RLS `(SELECT auth.uid())` rewrites + 3 aggregate SQL functions (`dashboard_stats`, `stats_range`, `profit_range`).
2. Rewrites of `useDashboard.ts`, `useStatistics.ts`, `useProfit.ts`, `useCustomerHistory.ts`, `useWarranty.ts` to consume them / stop over-fetching.
3. No UI or business-logic changes.
