-- 1. Backfill ticket_number for every shop, sequential by created_at then id
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at ASC, id ASC) AS rn
  FROM public.repairs
)
UPDATE public.repairs r
SET ticket_number = ranked.rn
FROM ranked
WHERE r.id = ranked.id
  AND (r.ticket_number IS DISTINCT FROM ranked.rn);

-- 2. Enforce NOT NULL + uniqueness per shop
ALTER TABLE public.repairs ALTER COLUMN ticket_number SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS repairs_user_ticket_unique
  ON public.repairs (user_id, ticket_number);

-- 3. Concurrency-safe trigger using transactional advisory lock per shop
CREATE OR REPLACE FUNCTION public.assign_repair_ticket_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num integer;
BEGIN
  -- Serialize concurrent inserts for the same shop only
  PERFORM pg_advisory_xact_lock(hashtext('repairs_ticket:' || NEW.user_id::text));

  SELECT COALESCE(MAX(ticket_number), 0) + 1
  INTO next_num
  FROM public.repairs
  WHERE user_id = NEW.user_id;

  NEW.ticket_number := next_num;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.assign_repair_ticket_number() FROM anon, authenticated;
