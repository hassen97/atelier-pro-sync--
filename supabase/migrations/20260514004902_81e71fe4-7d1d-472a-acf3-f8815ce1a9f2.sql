CREATE TABLE public.repair_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  repair_id UUID NOT NULL,
  customer_id UUID,
  amount NUMERIC NOT NULL DEFAULT 0,
  note TEXT,
  recorded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_repair_payments_repair ON public.repair_payments(repair_id);
CREATE INDEX idx_repair_payments_customer ON public.repair_payments(customer_id);
CREATE INDEX idx_repair_payments_user ON public.repair_payments(user_id);

ALTER TABLE public.repair_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner or team can view repair payments"
ON public.repair_payments FOR SELECT TO authenticated
USING ((auth.uid() = user_id) OR is_team_member(user_id, auth.uid()));

CREATE POLICY "Owner or team can manage repair payments"
ON public.repair_payments FOR ALL TO authenticated
USING ((auth.uid() = user_id) OR is_team_member(user_id, auth.uid()))
WITH CHECK ((auth.uid() = user_id) OR is_team_member(user_id, auth.uid()));

CREATE POLICY "Platform admin can view all repair_payments"
ON public.repair_payments FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'platform_admin'::app_role));