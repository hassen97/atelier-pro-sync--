
-- Fix RLS: repair_status_history is only accessed via SECURITY DEFINER RPC
-- Add a restrictive policy so no direct access is allowed
CREATE POLICY "No direct access - use RPC only"
ON public.repair_status_history
FOR ALL
USING (false);

-- Fix storage policies: restrict INSERT/UPDATE/DELETE to auth users
DROP POLICY IF EXISTS "Repair photos are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload repair photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update repair photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete repair photos" ON storage.objects;

CREATE POLICY "Repair photos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'repair-photos');

CREATE POLICY "Authenticated users can upload repair photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'repair-photos');

CREATE POLICY "Authenticated users can update repair photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'repair-photos');

CREATE POLICY "Authenticated users can delete repair photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'repair-photos');
