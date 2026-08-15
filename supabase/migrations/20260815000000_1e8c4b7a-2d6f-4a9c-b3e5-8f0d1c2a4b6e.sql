-- =====================================================================
-- Admin Security center support
-- 1) signup_attempts is write-only today (deny-all SELECT). Grant
--    platform admins read access so the new Security page can surface
--    rate-limit / load-test forensics (suspicious IPs, flood bursts).
-- 2) SECURITY DEFINER purge function so the admin UI can prune old
--    attempts without the service-role key.
-- =====================================================================

CREATE POLICY "Platform admins can view signup attempts"
ON public.signup_attempts
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'platform_admin'::app_role));

CREATE OR REPLACE FUNCTION public.purge_signup_attempts(keep_hours integer DEFAULT 24)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  removed integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'platform_admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  DELETE FROM public.signup_attempts
  WHERE created_at < now() - make_interval(hours => keep_hours);

  GET DIAGNOSTICS removed = ROW_COUNT;
  RETURN removed;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_signup_attempts(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purge_signup_attempts(integer) TO authenticated;
