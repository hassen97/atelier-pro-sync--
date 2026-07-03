
-- 1. Create expense_categories table for custom categories
CREATE TABLE public.expense_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner or team can manage expense categories"
  ON public.expense_categories FOR ALL
  TO authenticated
  USING ((auth.uid() = user_id) OR is_team_member(user_id, auth.uid()))
  WITH CHECK ((auth.uid() = user_id) OR is_team_member(user_id, auth.uid()));

-- 2. Add new fields to repairs table
ALTER TABLE public.repairs
  ADD COLUMN IF NOT EXISTS ticket_number integer,
  ADD COLUMN IF NOT EXISTS received_by text,
  ADD COLUMN IF NOT EXISTS repaired_by text,
  ADD COLUMN IF NOT EXISTS device_condition text;

-- 3. Create trigger function for sequential ticket numbers per user
CREATE OR REPLACE FUNCTION public.assign_repair_ticket_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num integer;
BEGIN
  SELECT COALESCE(MAX(ticket_number), 0) + 1
  INTO next_num
  FROM public.repairs
  WHERE user_id = NEW.user_id;
  
  NEW.ticket_number := next_num;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_repair_ticket_number
  BEFORE INSERT ON public.repairs
  FOR EACH ROW
  WHEN (NEW.ticket_number IS NULL)
  EXECUTE FUNCTION public.assign_repair_ticket_number();
