-- Platform admin read access to signup attempts (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'signup_attempts'
      AND policyname = 'Platform admins can view signup attempts'
  ) THEN
    CREATE POLICY "Platform admins can view signup attempts"
    ON public.signup_attempts
    FOR SELECT
    TO authenticated
    USING (public.has_role((SELECT auth.uid()), 'platform_admin'::app_role));
  END IF;
END
$$;

GRANT SELECT ON public.signup_attempts TO authenticated;
GRANT ALL ON public.signup_attempts TO service_role;

-- Purge function used by the admin Security page
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
  WHERE created_at < now() - make_interval(hours => GREATEST(COALESCE(keep_hours, 24), 0));

  GET DIAGNOSTICS removed = ROW_COUNT;
  RETURN removed;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_signup_attempts(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purge_signup_attempts(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.purge_signup_attempts(integer) TO service_role;