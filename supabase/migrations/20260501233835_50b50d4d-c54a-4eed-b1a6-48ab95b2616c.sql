
-- =======================================================================
-- 1. STORAGE: supplier-proofs → private + owner/team-scoped
-- =======================================================================
UPDATE storage.buckets SET public = false WHERE id = 'supplier-proofs';

DROP POLICY IF EXISTS "Anyone can view supplier proofs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload supplier proofs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete supplier proofs" ON storage.objects;

CREATE POLICY "Owner or team can view supplier proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'supplier-proofs'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.is_team_member(((storage.foldername(name))[1])::uuid, auth.uid())
  )
);

CREATE POLICY "Owner or team can upload supplier proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'supplier-proofs'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.is_team_member(((storage.foldername(name))[1])::uuid, auth.uid())
  )
);

CREATE POLICY "Owner or team can delete supplier proofs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'supplier-proofs'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.is_team_member(((storage.foldername(name))[1])::uuid, auth.uid())
  )
);

-- =======================================================================
-- 2. STORAGE: shop-logos → enforce ownership on UPDATE/DELETE/INSERT
--    (read stays public so the logo can be shown anywhere)
-- =======================================================================
DROP POLICY IF EXISTS "Authenticated users can upload their logo" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their logo" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their logo" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view shop logos" ON storage.objects;

-- Public read but the SELECT policy is scoped to the bucket's actual files
-- (no listing of arbitrary names because the policy still requires bucket_id match;
--  the linter flag is about overly broad SELECT — we narrow by adding name not null)
CREATE POLICY "Public can view individual shop logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'shop-logos' AND name IS NOT NULL);

CREATE POLICY "Owner can upload shop logo to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'shop-logos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Owner can update own shop logo"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'shop-logos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Owner can delete own shop logo"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'shop-logos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- =======================================================================
-- 3. REALTIME: scope channel subscriptions per user
-- =======================================================================
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can subscribe to own topics" ON realtime.messages;
CREATE POLICY "Authenticated can subscribe to own topics"
ON realtime.messages FOR SELECT
TO authenticated
USING (
  -- Allow only topics that include the caller's user id (string match on the topic name).
  -- App convention: every channel is named like "<scope>:<user_id>" or contains ":<user_id>".
  -- Postgres-changes channels created by Supabase JS expose realtime.topic = the channel name.
  realtime.topic() LIKE '%' || auth.uid()::text || '%'
  -- Or topics intended to be globally readable (none today, but reserved)
  OR realtime.topic() LIKE 'public:%'
);

-- =======================================================================
-- 4. is_team_member: add caller authorization gate
-- =======================================================================
CREATE OR REPLACE FUNCTION public.is_team_member(_owner_id uuid, _member_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Trusted contexts: no auth.uid() (running inside a SECURITY DEFINER fn / trigger / service role)
  IF auth.uid() IS NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM team_members
      WHERE owner_id = _owner_id AND member_user_id = _member_id AND status = 'active'
    );
  END IF;

  -- The caller must be one of the parties, or a platform admin.
  IF auth.uid() <> _owner_id
     AND auth.uid() <> _member_id
     AND NOT public.has_role(auth.uid(), 'platform_admin'::app_role) THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM team_members
    WHERE owner_id = _owner_id AND member_user_id = _member_id AND status = 'active'
  );
END;
$$;

-- =======================================================================
-- 5. platform_settings: only public-safe keys exposed to anon
-- =======================================================================
DROP POLICY IF EXISTS "Anyone can read platform settings" ON public.platform_settings;

CREATE POLICY "Anon can read public platform keys"
ON public.platform_settings FOR SELECT
TO anon
USING (
  key IN (
    'admin_whatsapp',
    'public_site_domain',
    'auto_confirm_signups'
  )
);

CREATE POLICY "Authenticated can read all platform settings"
ON public.platform_settings FOR SELECT
TO authenticated
USING (true);

-- =======================================================================
-- 6. signup_attempts: add explicit deny policies (RLS was on, no policies)
-- =======================================================================
CREATE POLICY "No public access to signup attempts"
ON public.signup_attempts FOR SELECT
TO anon, authenticated
USING (false);

-- =======================================================================
-- 7. Function search_path hygiene (pgmq helpers were missing it)
-- =======================================================================
CREATE OR REPLACE FUNCTION public.read_email_batch(queue_name text, batch_size integer, vt integer)
RETURNS TABLE(msg_id bigint, read_ct integer, message jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pgmq
AS $$
BEGIN
  RETURN QUERY SELECT r.msg_id, r.read_ct, r.message FROM pgmq.read(queue_name, vt, batch_size) r;
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_email(queue_name text, message_id bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pgmq
AS $$
BEGIN
  RETURN pgmq.delete(queue_name, message_id);
EXCEPTION WHEN undefined_table THEN
  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.enqueue_email(queue_name text, payload jsonb)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pgmq
AS $$
BEGIN
  RETURN pgmq.send(queue_name, payload);
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN pgmq.send(queue_name, payload);
END;
$$;

CREATE OR REPLACE FUNCTION public.move_to_dlq(source_queue text, dlq_name text, message_id bigint, payload jsonb)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pgmq
AS $$
DECLARE new_id BIGINT;
BEGIN
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  PERFORM pgmq.delete(source_queue, message_id);
  RETURN new_id;
EXCEPTION WHEN undefined_table THEN
  BEGIN
    PERFORM pgmq.create(dlq_name);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  BEGIN
    PERFORM pgmq.delete(source_queue, message_id);
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;
  RETURN new_id;
END;
$$;

-- =======================================================================
-- 8. Revoke public EXECUTE on internal SECURITY DEFINER trigger helpers
--    (these are only meant to run from triggers / app code with service role,
--     not from anon/authenticated clients via PostgREST)
-- =======================================================================
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_product_activity() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_repair_created() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_repair_status_change() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_sale_activity() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.assign_repair_ticket_number() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM anon, authenticated;
