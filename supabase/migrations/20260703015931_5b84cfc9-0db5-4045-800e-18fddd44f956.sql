
-- ============================================================
-- 1. payment_gateways: stop exposing raw config to all users
-- ============================================================
DROP POLICY IF EXISTS "Anyone can view enabled gateways" ON public.payment_gateways;

CREATE OR REPLACE FUNCTION public.get_enabled_payment_gateways()
RETURNS TABLE (
  id uuid,
  gateway_key text,
  gateway_name text,
  description text,
  config jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, gateway_key, gateway_name, description, config
  FROM public.payment_gateways
  WHERE is_enabled = true;
$$;

REVOKE EXECUTE ON FUNCTION public.get_enabled_payment_gateways() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_enabled_payment_gateways() TO authenticated;

-- ============================================================
-- 2. platform_settings: restrict authenticated reads to whitelist
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can read all platform settings" ON public.platform_settings;

CREATE POLICY "Authenticated can read public platform keys"
ON public.platform_settings
FOR SELECT
TO authenticated
USING (
  key = ANY (ARRAY[
    'admin_whatsapp'::text,
    'public_site_domain'::text,
    'auto_confirm_signups'::text,
    'demo_user_id'::text
  ])
);

-- ============================================================
-- 3. Remove always-true INSERT policies on public forms
-- ============================================================
DROP POLICY IF EXISTS "Anyone can submit reset request" ON public.password_reset_requests;
CREATE POLICY "Anyone can submit reset request"
ON public.password_reset_requests
FOR INSERT
TO public
WITH CHECK (
  username IS NOT NULL
  AND char_length(username) BETWEEN 1 AND 60
);

DROP POLICY IF EXISTS "Anyone can join waitlist" ON public.waitlist;
CREATE POLICY "Anyone can join waitlist"
ON public.waitlist
FOR INSERT
TO public
WITH CHECK (
  email IS NOT NULL
  AND char_length(email) BETWEEN 3 AND 320
  AND signed_up_user_id IS NULL
);

-- ============================================================
-- 4. Storage: remove broad "list all" SELECT policies on public buckets
--    (public URLs continue to work without these policies)
-- ============================================================
DROP POLICY IF EXISTS "Public can view individual shop logos" ON storage.objects;
DROP POLICY IF EXISTS "Repair photos are publicly accessible" ON storage.objects;

-- ============================================================
-- 5. Lock down SECURITY DEFINER functions that clients never call directly
-- ============================================================
-- Trigger + internal helper functions: no direct execution needed by anyone
REVOKE EXECUTE ON FUNCTION public.assign_repair_ticket_number() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_referral_on_onboarding() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.link_to_open_session() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_product_activity() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_repair_created() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_repair_status_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_sale_activity() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_team_member_role() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_or_create_open_session(uuid) FROM PUBLIC, anon, authenticated;

-- Admin diagnostics: keep signed-in access (guarded internally by has_role), drop anon
REVOKE EXECUTE ON FUNCTION public.get_active_connections() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_active_connections() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_db_table_sizes() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_db_table_sizes() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_slow_queries() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_slow_queries() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.detect_health_issues(numeric, numeric, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.detect_health_issues(numeric, numeric, numeric) TO authenticated;

-- Register session close: called via RPC by signed-in owners/team; drop anon
REVOKE EXECUTE ON FUNCTION public.close_register_session(uuid, jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.close_register_session(uuid, jsonb, text) TO authenticated;
