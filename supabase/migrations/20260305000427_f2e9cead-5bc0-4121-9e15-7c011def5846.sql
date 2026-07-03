
-- 1. Create product_returns table
CREATE TABLE public.product_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  sale_id uuid REFERENCES public.sales(id) ON DELETE SET NULL,
  sale_item_id uuid REFERENCES public.sale_items(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  refund_amount numeric NOT NULL DEFAULT 0,
  refund_method text NOT NULL DEFAULT 'cash',
  stock_destination text NOT NULL DEFAULT 'available',
  reason text NOT NULL DEFAULT '',
  notes text,
  approved_by uuid,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.product_returns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner or team can manage product returns"
  ON public.product_returns FOR ALL TO authenticated
  USING ((auth.uid() = user_id) OR is_team_member(user_id, auth.uid()));

CREATE POLICY "Owner or team can view product returns"
  ON public.product_returns FOR SELECT TO authenticated
  USING ((auth.uid() = user_id) OR is_team_member(user_id, auth.uid()));

-- 2. Alter defective_parts: add RMA columns
ALTER TABLE public.defective_parts
  ADD COLUMN IF NOT EXISTS sent_date timestamptz,
  ADD COLUMN IF NOT EXISTS resolution text,
  ADD COLUMN IF NOT EXISTS refund_amount numeric NOT NULL DEFAULT 0;

-- 3. Alter warranty_tickets: add traceability note
ALTER TABLE public.warranty_tickets
  ADD COLUMN IF NOT EXISTS original_repair_link_note text;
