-- ============================================================
-- Scope repair-photos write access to the owning shop / team
-- (public SELECT is intentionally kept: repair photos are shown
--  on public customer tracking pages)
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can upload repair photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update repair photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete repair photos" ON storage.objects;

CREATE POLICY "Owner or team can upload repair photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'repair-photos'
  AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR public.is_team_member(((storage.foldername(name))[1])::uuid, auth.uid())
  )
);

CREATE POLICY "Owner or team can update repair photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'repair-photos'
  AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR public.is_team_member(((storage.foldername(name))[1])::uuid, auth.uid())
  )
);

CREATE POLICY "Owner or team can delete repair photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'repair-photos'
  AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR public.is_team_member(((storage.foldername(name))[1])::uuid, auth.uid())
  )
);

-- ============================================================
-- Defensively remove any leftover permissive policies for
-- supplier-proofs and shop-logos (scoped owner/team policies
-- already exist and are kept). IF EXISTS => no-op if absent.
-- ============================================================
DROP POLICY IF EXISTS "Anyone can view supplier proofs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload supplier proofs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete supplier proofs" ON storage.objects;

DROP POLICY IF EXISTS "Users can update their logo" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their logo" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload their logo" ON storage.objects;