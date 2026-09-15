-- Password reset via 6-digit verification codes
-- Replaces the legacy Auth recovery link flow with a modern OTP-based approach.
-- Security model:
--   - 6-digit crypto-random codes, 10-minute expiry
--   - Single-use (verified flag)
--   - Brute-force protection (5 attempts max)
--   - Service-role only access (no user queries)
--   - Auto-cleanup of expired codes

CREATE TABLE IF NOT EXISTS public.password_reset_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts int NOT NULL DEFAULT 0,
  verified boolean NOT NULL DEFAULT false,
  verified_at timestamptz,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Fast lookup for verification: user_id + code + active status
CREATE INDEX idx_reset_codes_lookup ON public.password_reset_codes (user_id, verified, expires_at DESC) 
WHERE verified = false;

-- Audit/cleanup by timestamp
CREATE INDEX idx_reset_codes_created ON public.password_reset_codes (created_at DESC);

-- Grant service-role full access
GRANT ALL ON public.password_reset_codes TO service_role;

-- Enable RLS with deny-all (service-role bypasses RLS)
ALTER TABLE public.password_reset_codes ENABLE ROW LEVEL SECURITY;

-- No policies = no user access, service-role only

-- Auto-cleanup function: delete codes older than 24 hours
-- Keeps the table lean and removes stale entries
CREATE OR REPLACE FUNCTION public.cleanup_expired_reset_codes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.password_reset_codes
  WHERE created_at < (now() - interval '24 hours');
END;
$$;

-- Trigger to run cleanup automatically on INSERT
-- Low overhead: only fires once per reset request, no scheduled job needed
CREATE OR REPLACE FUNCTION public.trigger_cleanup_reset_codes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Fire-and-forget cleanup (won't block the insert)
  PERFORM public.cleanup_expired_reset_codes();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_cleanup_reset_codes ON public.password_reset_codes;
CREATE TRIGGER trigger_cleanup_reset_codes
AFTER INSERT ON public.password_reset_codes
FOR EACH STATEMENT
EXECUTE FUNCTION public.trigger_cleanup_reset_codes();

-- Optional: Platform admins can view codes for support/audit
-- (uncomment if needed)
-- CREATE POLICY "Platform admins can view reset codes"
-- ON public.password_reset_codes
-- FOR SELECT
-- TO authenticated
-- USING (public.has_role((select auth.uid()), 'platform_admin'::app_role));
