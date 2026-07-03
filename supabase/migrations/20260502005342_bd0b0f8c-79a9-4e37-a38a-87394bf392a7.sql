-- Give ticket_number a placeholder default so application inserts don't need to supply it
ALTER TABLE public.repairs ALTER COLUMN ticket_number SET DEFAULT 0;

-- Recreate the trigger without the WHEN clause so it ALWAYS assigns the next number on INSERT,
-- ignoring whatever client-side value (0/null/garbage) was passed in.
DROP TRIGGER IF EXISTS set_repair_ticket_number ON public.repairs;

CREATE TRIGGER set_repair_ticket_number
  BEFORE INSERT ON public.repairs
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_repair_ticket_number();
