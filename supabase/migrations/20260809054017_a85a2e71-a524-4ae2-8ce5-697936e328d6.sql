-- ============================================================================
-- RLS performance + isolation hardening
-- Rewrites every policy expression containing auth.uid() into the
-- init-plan form (select auth.uid()), preserving the exact same logic.
-- Idempotent: re-running normalizes already-converted policies unchanged.
-- ============================================================================

DO $do$
DECLARE
  r            record;
  v_using      text;
  v_check      text;
  v_roles      text;
  v_sql        text;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname, cmd, roles::text[] AS roles,
           coalesce(qual, '')       AS qual,
           coalesce(with_check, '') AS with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (coalesce(qual, '') || coalesce(with_check, '')) LIKE '%auth.uid()%'
  LOOP
    -- Normalize: collapse any already-wrapped form, then wrap uniformly.
    v_using := replace(replace(r.qual,
                 '( SELECT auth.uid() AS uid)', 'auth.uid()'),
                 'auth.uid()', '(select auth.uid())');
    v_check := replace(replace(r.with_check,
                 '( SELECT auth.uid() AS uid)', 'auth.uid()'),
                 'auth.uid()', '(select auth.uid())');

    -- Pin implicit PUBLIC policies to authenticated, EXCEPT those whose
    -- expression intentionally targets backend/service traffic.
    IF r.roles = ARRAY['public']
       AND (r.qual || r.with_check) NOT LIKE '%service_role%'
       AND (r.qual || r.with_check) NOT LIKE '%auth.role()%' THEN
      v_roles := 'authenticated';
    ELSE
      v_roles := array_to_string(r.roles, ', ');
    END IF;

    v_sql := format('DROP POLICY IF EXISTS %I ON public.%I;', r.policyname, r.tablename);
    EXECUTE v_sql;

    v_sql := format('CREATE POLICY %I ON public.%I FOR %s TO %s',
                    r.policyname, r.tablename, r.cmd, v_roles);
    IF v_using <> '' THEN
      v_sql := v_sql || ' USING (' || v_using || ')';
    END IF;
    IF v_check <> '' THEN
      v_sql := v_sql || ' WITH CHECK (' || v_check || ')';
    END IF;

    EXECUTE v_sql || ';';
  END LOOP;
END
$do$;

-- ============================================================================
-- Re-assert that the anonymous (publishable key) role has no access to core
-- business tables. Data reachable without a session goes through dedicated
-- SECURITY DEFINER functions (e.g. get_repair_by_token) instead.
-- ============================================================================

REVOKE ALL ON public.repairs         FROM anon;
REVOKE ALL ON public.repair_parts    FROM anon;
REVOKE ALL ON public.repair_payments FROM anon;
REVOKE ALL ON public.products        FROM anon;
REVOKE ALL ON public.customers       FROM anon;
REVOKE ALL ON public.customer_vault  FROM anon;
REVOKE ALL ON public.sales           FROM anon;
REVOKE ALL ON public.sale_items      FROM anon;
REVOKE ALL ON public.expenses        FROM anon;
REVOKE ALL ON public.invoices        FROM anon;
REVOKE ALL ON public.suppliers       FROM anon;
REVOKE ALL ON public.shop_settings   FROM anon;
REVOKE ALL ON public.profiles        FROM anon;
REVOKE ALL ON public.user_roles      FROM anon;
REVOKE ALL ON public.team_members    FROM anon;
REVOKE ALL ON public.activity_log    FROM anon;

-- ============================================================================
-- storage.objects: same init-plan rewrite, identical folder-scoped logic.
-- ============================================================================

-- shop-logos (public bucket, writes owner-scoped)
DROP POLICY IF EXISTS "Owner can upload shop logo to own folder" ON storage.objects;
CREATE POLICY "Owner can upload shop logo to own folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'shop-logos'
    AND (storage.foldername(name))[1] = ((select auth.uid()))::text
  );

DROP POLICY IF EXISTS "Owner can update own shop logo" ON storage.objects;
CREATE POLICY "Owner can update own shop logo" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'shop-logos'
    AND (storage.foldername(name))[1] = ((select auth.uid()))::text
  );

DROP POLICY IF EXISTS "Owner can delete own shop logo" ON storage.objects;
CREATE POLICY "Owner can delete own shop logo" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'shop-logos'
    AND (storage.foldername(name))[1] = ((select auth.uid()))::text
  );

-- repair-photos (public bucket, writes owner-or-team scoped)
DROP POLICY IF EXISTS "Owner or team can upload repair photos" ON storage.objects;
CREATE POLICY "Owner or team can upload repair photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'repair-photos'
    AND (
      (storage.foldername(name))[1] = ((select auth.uid()))::text
      OR public.is_team_member(((storage.foldername(name))[1])::uuid, (select auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Owner or team can update repair photos" ON storage.objects;
CREATE POLICY "Owner or team can update repair photos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'repair-photos'
    AND (
      (storage.foldername(name))[1] = ((select auth.uid()))::text
      OR public.is_team_member(((storage.foldername(name))[1])::uuid, (select auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Owner or team can delete repair photos" ON storage.objects;
CREATE POLICY "Owner or team can delete repair photos" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'repair-photos'
    AND (
      (storage.foldername(name))[1] = ((select auth.uid()))::text
      OR public.is_team_member(((storage.foldername(name))[1])::uuid, (select auth.uid()))
    )
  );

-- supplier-proofs (private bucket, owner-or-team scoped)
DROP POLICY IF EXISTS "Owner or team can view supplier proofs" ON storage.objects;
CREATE POLICY "Owner or team can view supplier proofs" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'supplier-proofs'
    AND (
      (storage.foldername(name))[1] = ((select auth.uid()))::text
      OR public.is_team_member(((storage.foldername(name))[1])::uuid, (select auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Owner or team can upload supplier proofs" ON storage.objects;
CREATE POLICY "Owner or team can upload supplier proofs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'supplier-proofs'
    AND (
      (storage.foldername(name))[1] = ((select auth.uid()))::text
      OR public.is_team_member(((storage.foldername(name))[1])::uuid, (select auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Owner or team can delete supplier proofs" ON storage.objects;
CREATE POLICY "Owner or team can delete supplier proofs" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'supplier-proofs'
    AND (
      (storage.foldername(name))[1] = ((select auth.uid()))::text
      OR public.is_team_member(((storage.foldername(name))[1])::uuid, (select auth.uid()))
    )
  );

-- payment-proofs (private bucket, own folder + platform admin read)
DROP POLICY IF EXISTS "Users can upload payment proofs" ON storage.objects;
CREATE POLICY "Users can upload payment proofs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'payment-proofs'
    AND (storage.foldername(name))[1] = ((select auth.uid()))::text
  );

DROP POLICY IF EXISTS "Users can view own payment proofs" ON storage.objects;
CREATE POLICY "Users can view own payment proofs" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'payment-proofs'
    AND (storage.foldername(name))[1] = ((select auth.uid()))::text
  );

DROP POLICY IF EXISTS "Platform admins can view all payment proofs" ON storage.objects;
CREATE POLICY "Platform admins can view all payment proofs" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'payment-proofs'
    AND public.has_role((select auth.uid()), 'platform_admin'::app_role)
  );
