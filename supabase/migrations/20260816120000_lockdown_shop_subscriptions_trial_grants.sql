-- =====================================================================
-- Lock down shop_subscriptions + server-authoritative welcome trials
-- =====================================================================
-- Before this migration, any authenticated user could INSERT/UPDATE their
-- own shop_subscriptions row (any plan, any status, any expiry) — and the
-- client-side 7-day trial grant in Auth.tsx relied on exactly that. This
-- made free-premium-forever trivially exploitable from DevTools.
--
-- Now: owners can only READ their subscription; all writes go through
-- server-side paths (grant-trial edge function, admin tooling, order
-- approval) using the service role or the platform-admin policy below.
-- =====================================================================

-- 1) trial_claims: append-only log driving "one trial per user" and the
--    per-IP fraud cap. Written exclusively by the grant-trial edge function
--    (service role); deny-all RLS for everyone else.
CREATE TABLE IF NOT EXISTS public.trial_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trial_claims_user_id ON public.trial_claims (user_id);
CREATE INDEX IF NOT EXISTS idx_trial_claims_ip_created ON public.trial_claims (ip_address, created_at);

ALTER TABLE public.trial_claims ENABLE ROW LEVEL SECURITY;
-- No policies: only service_role (edge functions) can read/write this table.

-- 2) shop_subscriptions: authoritative policy set.
ALTER TABLE public.shop_subscriptions ENABLE ROW LEVEL SECURITY;

-- Remove the self-service write policies (the vulnerability).
DROP POLICY IF EXISTS "Users can insert own subscription" ON public.shop_subscriptions;
DROP POLICY IF EXISTS "Users can update own subscription" ON public.shop_subscriptions;

-- Table privileges: authenticated may read; writes are gated by policies
-- below (platform admins only). Grants are idempotent.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_subscriptions TO authenticated;

-- Owners can read their own subscription (ProtectedRoute funnel,
-- useSubscription, TrialBanner all depend on this).
DROP POLICY IF EXISTS "Owners can view own subscription" ON public.shop_subscriptions;
CREATE POLICY "Owners can view own subscription"
ON public.shop_subscriptions FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'platform_admin'::app_role)
);

-- Platform admins keep full management access (order approval, God Mode
-- set/adjust subscription in useSubscription.ts).
DROP POLICY IF EXISTS "Platform admins manage subscriptions" ON public.shop_subscriptions;
CREATE POLICY "Platform admins manage subscriptions"
ON public.shop_subscriptions FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'platform_admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'platform_admin'::app_role));

-- 3) Cleanup of obvious past abuse (optional, conservative): expire any
--    self-inserted trial rows whose expiry is more than 40 days out — no
--    legitimate grant ever exceeds 31 days (1-month paid or 7-day trial).
UPDATE public.shop_subscriptions
SET status = 'canceled'
WHERE status = 'trialing'
  AND expires_at IS NOT NULL
  AND expires_at > now() + interval '40 days';
