CREATE TABLE public.customer_vault (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  account_type text NOT NULL CHECK (account_type IN ('icloud','google','samsung')),
  email_id text NOT NULL,
  password text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_customer_vault_user ON public.customer_vault(user_id);
CREATE INDEX idx_customer_vault_customer ON public.customer_vault(customer_id);

ALTER TABLE public.customer_vault ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner or team can view customer_vault"
  ON public.customer_vault FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR is_team_member(user_id, auth.uid()));

CREATE POLICY "Owner or team can manage customer_vault"
  ON public.customer_vault FOR ALL TO authenticated
  USING (auth.uid() = user_id OR is_team_member(user_id, auth.uid()))
  WITH CHECK (auth.uid() = user_id OR is_team_member(user_id, auth.uid()));

CREATE POLICY "Platform admin can view all customer_vault"
  ON public.customer_vault FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'platform_admin'::app_role));

CREATE TRIGGER update_customer_vault_updated_at
  BEFORE UPDATE ON public.customer_vault
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();