-- 1. Register sessions table
CREATE TABLE public.register_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id uuid NOT NULL,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Each shop can have at most one open session
CREATE UNIQUE INDEX register_sessions_one_open_per_shop
  ON public.register_sessions (shop_id)
  WHERE status = 'open';

CREATE INDEX register_sessions_shop_idx ON public.register_sessions (shop_id, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.register_sessions TO authenticated;
GRANT ALL ON public.register_sessions TO service_role;

ALTER TABLE public.register_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner or team can manage register sessions"
  ON public.register_sessions FOR ALL
  USING ((auth.uid() = shop_id) OR public.is_team_member(shop_id, auth.uid()))
  WITH CHECK ((auth.uid() = shop_id) OR public.is_team_member(shop_id, auth.uid()));

CREATE POLICY "Platform admin can view all register sessions"
  ON public.register_sessions FOR SELECT
  USING (public.has_role(auth.uid(), 'platform_admin'::app_role));

-- 2. Link columns on transaction tables
ALTER TABLE public.sales ADD COLUMN session_id uuid REFERENCES public.register_sessions(id) ON DELETE SET NULL;
ALTER TABLE public.repair_payments ADD COLUMN session_id uuid REFERENCES public.register_sessions(id) ON DELETE SET NULL;
ALTER TABLE public.expenses ADD COLUMN session_id uuid REFERENCES public.register_sessions(id) ON DELETE SET NULL;

CREATE INDEX sales_session_idx ON public.sales (session_id);
CREATE INDEX repair_payments_session_idx ON public.repair_payments (session_id);
CREATE INDEX expenses_session_idx ON public.expenses (session_id);

-- 3. Helper: get or create the open session for a shop
CREATE OR REPLACE FUNCTION public.get_or_create_open_session(_shop_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('register_session:' || _shop_id::text));

  SELECT id INTO v_session_id
  FROM public.register_sessions
  WHERE shop_id = _shop_id AND status = 'open'
  ORDER BY opened_at DESC
  LIMIT 1;

  IF v_session_id IS NULL THEN
    INSERT INTO public.register_sessions (shop_id, status)
    VALUES (_shop_id, 'open')
    RETURNING id INTO v_session_id;
  END IF;

  RETURN v_session_id;
END;
$$;

-- 4. Close current session and open a fresh one
CREATE OR REPLACE FUNCTION public.close_register_session(_shop_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_closed_id uuid;
BEGIN
  -- Authorization: only the shop owner or an active team member may close
  IF auth.uid() IS NOT NULL
     AND auth.uid() <> _shop_id
     AND NOT public.is_team_member(_shop_id, auth.uid())
     AND NOT public.has_role(auth.uid(), 'platform_admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized to close this register';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('register_session:' || _shop_id::text));

  UPDATE public.register_sessions
  SET status = 'closed', closed_at = now()
  WHERE shop_id = _shop_id AND status = 'open'
  RETURNING id INTO v_closed_id;

  -- Always ensure a fresh open session exists afterwards
  INSERT INTO public.register_sessions (shop_id, status)
  VALUES (_shop_id, 'open');

  RETURN v_closed_id;
END;
$$;

-- 5. Trigger to auto-link new transactions to the open session
CREATE OR REPLACE FUNCTION public.link_to_open_session()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.session_id IS NULL AND NEW.user_id IS NOT NULL THEN
    NEW.session_id := public.get_or_create_open_session(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER link_session_sales
  BEFORE INSERT ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.link_to_open_session();

CREATE TRIGGER link_session_repair_payments
  BEFORE INSERT ON public.repair_payments
  FOR EACH ROW EXECUTE FUNCTION public.link_to_open_session();

CREATE TRIGGER link_session_expenses
  BEFORE INSERT ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.link_to_open_session();

-- 6. Backfill: one open session per existing shop that has none
INSERT INTO public.register_sessions (shop_id, status)
SELECT s.user_id, 'open'
FROM public.shop_settings s
WHERE NOT EXISTS (
  SELECT 1 FROM public.register_sessions r
  WHERE r.shop_id = s.user_id AND r.status = 'open'
);