
-- 1. Warranty tickets table
CREATE TABLE public.warranty_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  original_repair_id UUID NOT NULL REFERENCES public.repairs(id) ON DELETE CASCADE,
  return_reason TEXT NOT NULL DEFAULT 'supplier_defect',
  action_taken TEXT,
  labor_cost NUMERIC NOT NULL DEFAULT 0,
  parts_cost NUMERIC NOT NULL DEFAULT 0,
  total_cost NUMERIC NOT NULL DEFAULT 0,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.warranty_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner or team can view warranty tickets"
  ON public.warranty_tickets FOR SELECT
  USING ((auth.uid() = user_id) OR is_team_member(user_id, auth.uid()));

CREATE POLICY "Owner or team can manage warranty tickets"
  ON public.warranty_tickets FOR ALL
  USING ((auth.uid() = user_id) OR is_team_member(user_id, auth.uid()));

-- 2. Defective parts table
CREATE TABLE public.defective_parts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  warranty_ticket_id UUID NOT NULL REFERENCES public.warranty_tickets(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  supplier_id UUID REFERENCES public.suppliers(id),
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.defective_parts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner or team can view defective parts"
  ON public.defective_parts FOR SELECT
  USING ((auth.uid() = user_id) OR is_team_member(user_id, auth.uid()));

CREATE POLICY "Owner or team can manage defective parts"
  ON public.defective_parts FOR ALL
  USING ((auth.uid() = user_id) OR is_team_member(user_id, auth.uid()));

-- 3. Add warranty columns to repairs
ALTER TABLE public.repairs ADD COLUMN is_warranty BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.repairs ADD COLUMN warranty_ticket_id UUID REFERENCES public.warranty_tickets(id);

-- 4. Add last_online_at to profiles
ALTER TABLE public.profiles ADD COLUMN last_online_at TIMESTAMP WITH TIME ZONE;

-- 5. Enable realtime on warranty_tickets
ALTER PUBLICATION supabase_realtime ADD TABLE public.warranty_tickets;

-- 6. Trigger for updated_at on warranty_tickets
CREATE TRIGGER update_warranty_tickets_updated_at
  BEFORE UPDATE ON public.warranty_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
