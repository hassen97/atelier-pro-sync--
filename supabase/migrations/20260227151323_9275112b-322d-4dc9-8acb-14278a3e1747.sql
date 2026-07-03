
-- Create supplier_transactions table
CREATE TABLE public.supplier_transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('purchase', 'payment')),
  description text,
  amount numeric NOT NULL DEFAULT 0,
  running_balance numeric NOT NULL DEFAULT 0,
  proof_url text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.supplier_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner or team can manage supplier transactions"
ON public.supplier_transactions FOR ALL
USING ((auth.uid() = user_id) OR is_team_member(user_id, auth.uid()));

CREATE POLICY "Owner or team can view supplier transactions"
ON public.supplier_transactions FOR SELECT
USING ((auth.uid() = user_id) OR is_team_member(user_id, auth.uid()));

-- Create supplier_purchases table
CREATE TABLE public.supplier_purchases (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  transaction_id uuid REFERENCES public.supplier_transactions(id) ON DELETE SET NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  item_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  total_price numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.supplier_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner or team can manage supplier purchases"
ON public.supplier_purchases FOR ALL
USING ((auth.uid() = user_id) OR is_team_member(user_id, auth.uid()));

CREATE POLICY "Owner or team can view supplier purchases"
ON public.supplier_purchases FOR SELECT
USING ((auth.uid() = user_id) OR is_team_member(user_id, auth.uid()));

-- Storage bucket for payment proofs
INSERT INTO storage.buckets (id, name, public) VALUES ('supplier-proofs', 'supplier-proofs', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload supplier proofs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'supplier-proofs' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can view supplier proofs"
ON storage.objects FOR SELECT
USING (bucket_id = 'supplier-proofs');

CREATE POLICY "Authenticated users can delete supplier proofs"
ON storage.objects FOR DELETE
USING (bucket_id = 'supplier-proofs' AND auth.role() = 'authenticated');

-- Updated_at trigger for supplier_transactions
CREATE TRIGGER update_supplier_transactions_updated_at
BEFORE UPDATE ON public.supplier_transactions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
