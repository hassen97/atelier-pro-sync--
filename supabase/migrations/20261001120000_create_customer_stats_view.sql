-- ─────────────────────────────────────────────────────────────────────────────
-- customer_stats: per-customer aggregates for the Clients page
--   * repair count / billed / paid
--   * sale count / billed / paid
--   * combined total_billed, total_paid, outstanding (real "Solde")
--
-- Purely additive: creates a NEW view only. No existing table, column,
-- trigger, policy or query is modified. security_invoker = true makes the
-- underlying repairs/sales RLS apply, so each shop only ever sees its own
-- aggregated rows (tenant-scoped by user_id).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.customer_stats
WITH (security_invoker = true)
AS
WITH rep AS (
  SELECT
    r.user_id,
    r.customer_id,
    count(*)::int                        AS repair_count,
    coalesce(sum(r.total_cost), 0)::numeric   AS repair_total,
    coalesce(sum(r.amount_paid), 0)::numeric  AS repair_paid
  FROM public.repairs r
  WHERE r.customer_id IS NOT NULL
  GROUP BY r.user_id, r.customer_id
),
sal AS (
  SELECT
    s.user_id,
    s.customer_id,
    count(*)::int                          AS sale_count,
    coalesce(sum(s.total_amount), 0)::numeric AS sale_total,
    coalesce(sum(s.amount_paid), 0)::numeric  AS sale_paid
  FROM public.sales s
  WHERE s.customer_id IS NOT NULL
  GROUP BY s.user_id, s.customer_id
)
SELECT
  coalesce(rep.user_id, sal.user_id)          AS user_id,
  coalesce(rep.customer_id, sal.customer_id)  AS customer_id,
  coalesce(rep.repair_count, 0)               AS repair_count,
  coalesce(rep.repair_total, 0)               AS repair_total,
  coalesce(rep.repair_paid, 0)                AS repair_paid,
  coalesce(sal.sale_count, 0)                 AS sale_count,
  coalesce(sal.sale_total, 0)                 AS sale_total,
  coalesce(sal.sale_paid, 0)                  AS sale_paid,
  coalesce(rep.repair_total, 0) + coalesce(sal.sale_total, 0) AS total_billed,
  coalesce(rep.repair_paid, 0)  + coalesce(sal.sale_paid, 0)  AS total_paid,
  (coalesce(rep.repair_total, 0) + coalesce(sal.sale_total, 0))
    - (coalesce(rep.repair_paid, 0) + coalesce(sal.sale_paid, 0)) AS outstanding
FROM rep
FULL OUTER JOIN sal
  ON  rep.user_id     = sal.user_id
  AND rep.customer_id = sal.customer_id;

-- Allow the app role to read the view (row visibility still governed by
-- underlying-table RLS via security_invoker).
GRANT SELECT ON public.customer_stats TO authenticated;
