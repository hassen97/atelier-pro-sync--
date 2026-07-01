-- Finding 1: Remove overly broad shop-logos storage policies.
-- Scoped "Owner can update/delete own shop logo" policies already enforce folder ownership.
DROP POLICY IF EXISTS "Users can update their logo" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their logo" ON storage.objects;

-- Finding 3: Remove public-read policy on the private supplier-proofs bucket.
-- Scoped "Owner or team can view supplier proofs" policy already enforces ownership.
DROP POLICY IF EXISTS "Anyone can view supplier proofs" ON storage.objects;

-- Finding 2: Remove the permissive ALL policy on user_roles that let any super_admin
-- (shop owner) insert/update themselves into platform_admin. All legitimate role
-- writes happen through service-role edge functions which bypass RLS, so no client
-- write policy is needed. Read access is preserved via "Users can view own roles".
DROP POLICY IF EXISTS "Super admins can manage roles" ON public.user_roles;