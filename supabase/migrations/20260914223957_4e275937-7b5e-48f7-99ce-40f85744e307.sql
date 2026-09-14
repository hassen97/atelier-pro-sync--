CREATE TABLE IF NOT EXISTS public.password_reset_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  username text,
  ip_address text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pra_username_created ON public.password_reset_attempts (username, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pra_ip_created ON public.password_reset_attempts (ip_address, created_at DESC);

GRANT ALL ON public.password_reset_attempts TO service_role;

ALTER TABLE public.password_reset_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Platform admins can view reset attempts" ON public.password_reset_attempts;
CREATE POLICY "Platform admins can view reset attempts"
ON public.password_reset_attempts
FOR SELECT
TO authenticated
USING (public.has_role((select auth.uid()), 'platform_admin'::app_role));