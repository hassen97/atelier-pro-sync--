-- Public tracking page: status history lookup inside get_repair_by_token
CREATE INDEX IF NOT EXISTS idx_repair_status_history_repair_id
  ON public.repair_status_history (repair_id);

-- Products: filtered by owner, ordered by name (POS / Inventory / Dashboard)
CREATE INDEX IF NOT EXISTS idx_products_user_id_name
  ON public.products (user_id, name);

-- Repairs: owner list ordered by created_at, plus customer joins
CREATE INDEX IF NOT EXISTS idx_repairs_user_id_created_at
  ON public.repairs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_repairs_customer_id
  ON public.repairs (customer_id);

-- Sales: owner list ordered by created_at (POS / Profit / Dashboard)
CREATE INDEX IF NOT EXISTS idx_sales_user_id_created_at
  ON public.sales (user_id, created_at DESC);

-- Customers: owner-scoped lists and CRM lookups
CREATE INDEX IF NOT EXISTS idx_customers_user_id
  ON public.customers (user_id);

-- Expenses: owner-scoped lists ordered by created_at (Profit)
CREATE INDEX IF NOT EXISTS idx_expenses_user_id_created_at
  ON public.expenses (user_id, created_at DESC);

-- Shop subscriptions: login funnel guard in ProtectedRoute
CREATE INDEX IF NOT EXISTS idx_shop_subscriptions_user_id
  ON public.shop_subscriptions (user_id);

-- Repair payments: repair joins and owner-scoped reads (Repairs / Profit)
CREATE INDEX IF NOT EXISTS idx_repair_payments_repair_id
  ON public.repair_payments (repair_id);
CREATE INDEX IF NOT EXISTS idx_repair_payments_user_id
  ON public.repair_payments (user_id);
