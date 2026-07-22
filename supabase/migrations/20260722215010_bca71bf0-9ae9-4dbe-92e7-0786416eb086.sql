
-- ============================================================
-- Task 1: Foreign-key indexes
-- ============================================================
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

-- Composite indexes for hot list queries
CREATE INDEX IF NOT EXISTS idx_activity_log_user_created   ON public.activity_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_user_created       ON public.invoices(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_user_created       ON public.expenses(user_id, created_at DESC);

-- Drop unused / duplicate indexes
DROP INDEX IF EXISTS public.idx_repair_payments_repair;
DROP INDEX IF EXISTS public.idx_repair_payments_user;
DROP INDEX IF EXISTS public.idx_repair_payments_customer;
DROP INDEX IF EXISTS public.idx_email_send_log_recipient;
DROP INDEX IF EXISTS public.idx_unsubscribe_tokens_token;

-- ============================================================
-- Task 3: Rewrite RLS policies to evaluate auth.uid() once per query
-- Same permissions; wrap auth.uid() in (SELECT auth.uid()) so the
-- Postgres planner treats it as a stable init-plan and can use indexes.
-- ============================================================

-- repairs
DROP POLICY IF EXISTS "Owner or team can manage repairs" ON public.repairs;
DROP POLICY IF EXISTS "Owner or team can view repairs"   ON public.repairs;
DROP POLICY IF EXISTS "Platform admin can view all repairs" ON public.repairs;
CREATE POLICY "Owner or team can view repairs" ON public.repairs
  FOR SELECT USING (
    (SELECT auth.uid()) = user_id
    OR public.is_team_member(user_id, (SELECT auth.uid()))
  );
CREATE POLICY "Owner or team can manage repairs" ON public.repairs
  FOR ALL USING (
    (SELECT auth.uid()) = user_id
    OR public.is_team_member(user_id, (SELECT auth.uid()))
  );
CREATE POLICY "Platform admin can view all repairs" ON public.repairs
  FOR SELECT USING (public.has_role((SELECT auth.uid()), 'platform_admin'::app_role));

-- sales
DROP POLICY IF EXISTS "Owner or team can manage sales" ON public.sales;
DROP POLICY IF EXISTS "Owner or team can view sales"   ON public.sales;
DROP POLICY IF EXISTS "Platform admin can view all sales" ON public.sales;
CREATE POLICY "Owner or team can view sales" ON public.sales
  FOR SELECT USING (
    (SELECT auth.uid()) = user_id
    OR public.is_team_member(user_id, (SELECT auth.uid()))
  );
CREATE POLICY "Owner or team can manage sales" ON public.sales
  FOR ALL USING (
    (SELECT auth.uid()) = user_id
    OR public.is_team_member(user_id, (SELECT auth.uid()))
  );
CREATE POLICY "Platform admin can view all sales" ON public.sales
  FOR SELECT USING (public.has_role((SELECT auth.uid()), 'platform_admin'::app_role));

-- products
DROP POLICY IF EXISTS "Owner or team can manage products" ON public.products;
DROP POLICY IF EXISTS "Owner or team can view products"   ON public.products;
DROP POLICY IF EXISTS "Platform admin can view all products" ON public.products;
CREATE POLICY "Owner or team can view products" ON public.products
  FOR SELECT USING (
    (SELECT auth.uid()) = user_id
    OR public.is_team_member(user_id, (SELECT auth.uid()))
  );
CREATE POLICY "Owner or team can manage products" ON public.products
  FOR ALL USING (
    (SELECT auth.uid()) = user_id
    OR public.is_team_member(user_id, (SELECT auth.uid()))
  );
CREATE POLICY "Platform admin can view all products" ON public.products
  FOR SELECT USING (public.has_role((SELECT auth.uid()), 'platform_admin'::app_role));

-- customers
DROP POLICY IF EXISTS "Owner or team can manage customers" ON public.customers;
DROP POLICY IF EXISTS "Owner or team can view customers"   ON public.customers;
DROP POLICY IF EXISTS "Platform admin can view all customers" ON public.customers;
CREATE POLICY "Owner or team can view customers" ON public.customers
  FOR SELECT USING (
    (SELECT auth.uid()) = user_id
    OR public.is_team_member(user_id, (SELECT auth.uid()))
  );
CREATE POLICY "Owner or team can manage customers" ON public.customers
  FOR ALL USING (
    (SELECT auth.uid()) = user_id
    OR public.is_team_member(user_id, (SELECT auth.uid()))
  );
CREATE POLICY "Platform admin can view all customers" ON public.customers
  FOR SELECT USING (public.has_role((SELECT auth.uid()), 'platform_admin'::app_role));

-- activity_log
DROP POLICY IF EXISTS "Owner can view activity log" ON public.activity_log;
DROP POLICY IF EXISTS "Team members can view activity log" ON public.activity_log;
DROP POLICY IF EXISTS "Platform admin can view all activity_log" ON public.activity_log;
CREATE POLICY "Owner can view activity log" ON public.activity_log
  FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Team members can view activity log" ON public.activity_log
  FOR SELECT USING (public.is_team_member(user_id, (SELECT auth.uid())));
CREATE POLICY "Platform admin can view all activity_log" ON public.activity_log
  FOR SELECT USING (public.has_role((SELECT auth.uid()), 'platform_admin'::app_role));

-- expenses
DROP POLICY IF EXISTS "Owner or team can manage expenses" ON public.expenses;
DROP POLICY IF EXISTS "Owner or team can view expenses"   ON public.expenses;
DROP POLICY IF EXISTS "Platform admin can view all expenses" ON public.expenses;
CREATE POLICY "Owner or team can view expenses" ON public.expenses
  FOR SELECT USING (
    (SELECT auth.uid()) = user_id
    OR public.is_team_member(user_id, (SELECT auth.uid()))
  );
CREATE POLICY "Owner or team can manage expenses" ON public.expenses
  FOR ALL USING (
    (SELECT auth.uid()) = user_id
    OR public.is_team_member(user_id, (SELECT auth.uid()))
  );
CREATE POLICY "Platform admin can view all expenses" ON public.expenses
  FOR SELECT USING (public.has_role((SELECT auth.uid()), 'platform_admin'::app_role));

-- invoices
DROP POLICY IF EXISTS "Owner or team can manage invoices" ON public.invoices;
DROP POLICY IF EXISTS "Owner or team can view invoices"   ON public.invoices;
DROP POLICY IF EXISTS "Platform admin can view all invoices" ON public.invoices;
CREATE POLICY "Owner or team can view invoices" ON public.invoices
  FOR SELECT USING (
    (SELECT auth.uid()) = user_id
    OR public.is_team_member(user_id, (SELECT auth.uid()))
  );
CREATE POLICY "Owner or team can manage invoices" ON public.invoices
  FOR ALL USING (
    (SELECT auth.uid()) = user_id
    OR public.is_team_member(user_id, (SELECT auth.uid()))
  );
CREATE POLICY "Platform admin can view all invoices" ON public.invoices
  FOR SELECT USING (public.has_role((SELECT auth.uid()), 'platform_admin'::app_role));

-- ============================================================
-- Task 2: dashboard_stats aggregate function
-- Replaces the client-side full-table scan in useDashboard with a
-- single round-trip returning ~12 numbers.
-- ============================================================
CREATE OR REPLACE FUNCTION public.dashboard_stats(_shop_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_this  timestamptz := date_trunc('month', now());
  v_start_last  timestamptz := date_trunc('month', now() - interval '1 month');
  v_result jsonb;
BEGIN
  -- Authorization: caller must be the owner, an active team member, or a platform admin.
  IF auth.uid() IS NOT NULL
     AND auth.uid() <> _shop_id
     AND NOT public.is_team_member(_shop_id, auth.uid())
     AND NOT public.has_role(auth.uid(), 'platform_admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  WITH s AS (
    SELECT
      COALESCE(SUM(total_amount), 0)                                           AS sales_total_gross,
      COALESCE(SUM(total_amount) FILTER (WHERE created_at >= v_start_this), 0) AS sales_this_month,
      COALESCE(SUM(total_amount) FILTER (WHERE created_at >= v_start_last
                                           AND created_at <  v_start_this), 0) AS sales_last_month
    FROM public.sales WHERE user_id = _shop_id
  ),
  r AS (
    SELECT
      COUNT(*) FILTER (WHERE status = 'in_progress')                    AS repairs_in_progress,
      COUNT(*) FILTER (WHERE status IN ('completed','delivered'))       AS repairs_completed,
      COUNT(*) FILTER (WHERE status = 'pending')                        AS repairs_pending
    FROM public.repairs WHERE user_id = _shop_id
  ),
  p AS (
    SELECT
      COUNT(*)                                             AS total_products,
      COUNT(*) FILTER (WHERE quantity <= min_quantity)     AS stock_alerts
    FROM public.products WHERE user_id = _shop_id
  ),
  c AS (
    SELECT
      COUNT(*)                                                     AS total_customers,
      COALESCE(SUM(CASE WHEN balance < 0 THEN -balance ELSE 0 END), 0) AS customer_debts
    FROM public.customers WHERE user_id = _shop_id
  ),
  sup AS (
    SELECT
      COALESCE(SUM(CASE WHEN balance < 0 THEN -balance ELSE 0 END), 0) AS supplier_debts
    FROM public.suppliers WHERE user_id = _shop_id
  ),
  ret AS (
    SELECT COALESCE(SUM(refund_amount), 0) AS total_refunds
    FROM public.product_returns WHERE user_id = _shop_id
  )
  SELECT jsonb_build_object(
    'salesTotal',        (s.sales_total_gross - ret.total_refunds),
    'salesThisMonth',    s.sales_this_month,
    'salesLastMonth',    s.sales_last_month,
    'repairsInProgress', r.repairs_in_progress,
    'repairsCompleted',  r.repairs_completed,
    'repairsPending',    r.repairs_pending,
    'stockAlerts',       p.stock_alerts,
    'totalProducts',     p.total_products,
    'totalCustomers',    c.total_customers,
    'customerDebts',     c.customer_debts,
    'supplierDebts',     sup.supplier_debts
  )
  INTO v_result
  FROM s, r, p, c, sup, ret;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.dashboard_stats(uuid) TO authenticated;
