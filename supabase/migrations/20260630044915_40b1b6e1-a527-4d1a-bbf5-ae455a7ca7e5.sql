-- Add detailed report snapshot + closer identity to register sessions
ALTER TABLE public.register_sessions
  ADD COLUMN IF NOT EXISTS report_data jsonb,
  ADD COLUMN IF NOT EXISTS closed_by_name text;

-- Update close RPC to persist the detailed report snapshot and the employee who closed
CREATE OR REPLACE FUNCTION public.close_register_session(
  _shop_id uuid,
  _report jsonb DEFAULT NULL,
  _closed_by_name text DEFAULT NULL
)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_closed_id uuid;
  v_ventes numeric := 0;
  v_reparations numeric := 0;
  v_depenses numeric := 0;
BEGIN
  -- Authorization: only the shop owner or an active team member may close
  IF auth.uid() IS NOT NULL
     AND auth.uid() <> _shop_id
     AND NOT public.is_team_member(_shop_id, auth.uid())
     AND NOT public.has_role(auth.uid(), 'platform_admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized to close this register';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('register_session:' || _shop_id::text));

  -- Find the currently open session
  SELECT id INTO v_closed_id
  FROM public.register_sessions
  WHERE shop_id = _shop_id AND status = 'open'
  ORDER BY opened_at DESC
  LIMIT 1;

  IF v_closed_id IS NOT NULL THEN
    -- Compute final totals for this session
    SELECT COALESCE(SUM(total_amount), 0) INTO v_ventes
    FROM public.sales WHERE session_id = v_closed_id;

    SELECT COALESCE(SUM(amount), 0) INTO v_reparations
    FROM public.repair_payments WHERE session_id = v_closed_id;

    SELECT COALESCE(SUM(amount), 0) INTO v_depenses
    FROM public.expenses WHERE session_id = v_closed_id;

    UPDATE public.register_sessions
    SET status = 'closed',
        closed_at = now(),
        snapshot_ventes = v_ventes,
        snapshot_reparations = v_reparations,
        snapshot_depenses = v_depenses,
        snapshot_net = v_ventes + v_reparations - v_depenses,
        report_data = _report,
        closed_by_name = _closed_by_name
    WHERE id = v_closed_id;
  END IF;

  -- Always ensure a fresh open session exists afterwards
  INSERT INTO public.register_sessions (shop_id, status)
  VALUES (_shop_id, 'open');

  RETURN v_closed_id;
END;
$function$;