
-- Create subscription_orders table for payment tracking
CREATE TABLE public.subscription_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_id uuid REFERENCES public.subscription_plans(id) NOT NULL,
  gateway_key text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'DT',
  status text NOT NULL DEFAULT 'pending',
  proof_url text,
  admin_note text,
  reviewed_at timestamptz,
  reviewed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_orders ENABLE ROW LEVEL SECURITY;

-- Users can view own orders
CREATE POLICY "Users can view own orders" ON public.subscription_orders
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Users can create orders
CREATE POLICY "Users can create orders" ON public.subscription_orders
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Platform admins can view all orders
CREATE POLICY "Platform admins can view all orders" ON public.subscription_orders
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'platform_admin'::app_role));

-- Platform admins can update orders
CREATE POLICY "Platform admins can update orders" ON public.subscription_orders
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'platform_admin'::app_role));

-- Anyone can read payment gateways (for checkout page)
CREATE POLICY "Anyone can view enabled gateways" ON public.payment_gateways
  FOR SELECT TO authenticated
  USING (is_enabled = true);

-- Insert new payment methods (D17, USDT, Binance Pay) if not exists
INSERT INTO public.payment_gateways (gateway_key, gateway_name, description, is_enabled, config)
VALUES 
  ('d17', 'D17 / eDinar Smart', 'Paiement mobile via D17 ou eDinar Smart', false, '{}'),
  ('usdt', 'USDT (Tether)', 'Transfert crypto USDT via TRC20/ERC20', false, '{}'),
  ('binance_pay', 'Binance Pay', 'Paiement via Binance Pay ou B2B', false, '{}')
ON CONFLICT DO NOTHING;

-- Create storage bucket for payment proofs
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', false)
ON CONFLICT DO NOTHING;

-- Storage policies for payment proofs
CREATE POLICY "Users can upload payment proofs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'payment-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view own payment proofs" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'payment-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Platform admins can view all payment proofs" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'payment-proofs' AND has_role(auth.uid(), 'platform_admin'::app_role));
