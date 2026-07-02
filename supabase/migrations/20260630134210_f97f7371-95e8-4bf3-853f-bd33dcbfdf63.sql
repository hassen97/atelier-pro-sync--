-- Demo mode: flag the demo account and expose its id publicly
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

-- Allow anon visitors to read the demo account id (same pattern as admin_whatsapp)
DROP POLICY IF EXISTS "Anon can read public platform keys" ON public.platform_settings;
CREATE POLICY "Anon can read public platform keys"
ON public.platform_settings
FOR SELECT
TO anon
USING (key = ANY (ARRAY['admin_whatsapp'::text, 'public_site_domain'::text, 'auto_confirm_signups'::text, 'demo_user_id'::text]));