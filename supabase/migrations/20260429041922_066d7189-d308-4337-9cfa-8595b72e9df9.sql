-- 1. Customers: balance column
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS loyalty_points integer NOT NULL DEFAULT 0;

-- 2. Shop settings: loyalty config
ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS loyalty_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS loyalty_earn_rate numeric NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS loyalty_redeem_points integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS loyalty_redeem_value numeric NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS loyalty_min_redeem integer NOT NULL DEFAULT 100;

-- 3. Loyalty transactions ledger
CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('earned', 'redeemed', 'adjustment')),
  amount_points integer NOT NULL,
  amount_money numeric,
  source text,
  sale_id uuid,
  repair_id uuid,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_tx_customer ON public.loyalty_transactions (user_id, customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_loyalty_tx_sale ON public.loyalty_transactions (sale_id) WHERE sale_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_loyalty_tx_repair ON public.loyalty_transactions (repair_id) WHERE repair_id IS NOT NULL;

ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner or team can view loyalty_transactions"
  ON public.loyalty_transactions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_team_member(user_id, auth.uid()));

CREATE POLICY "Owner or team can insert loyalty_transactions"
  ON public.loyalty_transactions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.is_team_member(user_id, auth.uid()));

CREATE POLICY "Platform admin can view all loyalty_transactions"
  ON public.loyalty_transactions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'));