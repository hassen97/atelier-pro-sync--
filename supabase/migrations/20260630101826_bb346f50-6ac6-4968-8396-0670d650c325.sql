-- 1. Enum for referral status
DO $$ BEGIN
  CREATE TYPE public.referral_status AS ENUM ('pending', 'joined', 'rewarded');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Profile additions: referral_code + signup_fingerprint
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code text,
  ADD COLUMN IF NOT EXISTS signup_fingerprint text;

-- Unique index on referral_code (allows nulls)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_referral_code_key
  ON public.profiles (referral_code) WHERE referral_code IS NOT NULL;

-- Helper to generate a short, URL-safe, unambiguous code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  code text;
  i int;
  exists_already boolean;
BEGIN
  LOOP
    code := '';
    FOR i IN 1..7 LOOP
      code := code || substr(alphabet, floor(random() * length(alphabet))::int + 1, 1);
    END LOOP;
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE referral_code = code) INTO exists_already;
    EXIT WHEN NOT exists_already;
  END LOOP;
  RETURN code;
END;
$$;

-- Backfill referral codes for existing profiles
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT user_id FROM public.profiles WHERE referral_code IS NULL LOOP
    UPDATE public.profiles SET referral_code = public.generate_referral_code() WHERE user_id = r.user_id;
  END LOOP;
END $$;

-- Trigger to auto-assign a referral_code to new profiles
CREATE OR REPLACE FUNCTION public.set_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := public.generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_referral_code ON public.profiles;
CREATE TRIGGER trg_profiles_referral_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_referral_code();

-- 3. Referrals table
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  referred_email text,
  status public.referral_status NOT NULL DEFAULT 'pending',
  ip_fingerprint text,
  reward_granted_at timestamptz,
  rewarded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS referrals_referrer_id_idx ON public.referrals (referrer_id);
CREATE INDEX IF NOT EXISTS referrals_referred_id_idx ON public.referrals (referred_id);
CREATE INDEX IF NOT EXISTS referrals_status_idx ON public.referrals (status);

-- 4. Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;

-- 5. RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Owners can view referrals they sent
CREATE POLICY "Referrers can view their referrals"
  ON public.referrals FOR SELECT TO authenticated
  USING (referrer_id = auth.uid() OR public.has_role(auth.uid(), 'platform_admin'::app_role));

-- A new user can record the referral that brought them in
CREATE POLICY "Referred user can insert their referral"
  ON public.referrals FOR INSERT TO authenticated
  WITH CHECK (referred_id = auth.uid());

-- Platform admins can manage everything
CREATE POLICY "Platform admins manage referrals"
  ON public.referrals FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'platform_admin'::app_role));

-- updated_at trigger
DROP TRIGGER IF EXISTS update_referrals_updated_at ON public.referrals;
CREATE TRIGGER update_referrals_updated_at
  BEFORE UPDATE ON public.referrals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Onboarding-completion trigger: pending -> joined
CREATE OR REPLACE FUNCTION public.handle_referral_on_onboarding()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.onboarding_completed = true
     AND COALESCE(OLD.onboarding_completed, false) = false THEN
    UPDATE public.referrals
    SET status = 'joined'
    WHERE referred_id = NEW.user_id
      AND status = 'pending';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_referral_on_onboarding ON public.shop_settings;
CREATE TRIGGER trg_referral_on_onboarding
  AFTER UPDATE OF onboarding_completed ON public.shop_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_referral_on_onboarding();