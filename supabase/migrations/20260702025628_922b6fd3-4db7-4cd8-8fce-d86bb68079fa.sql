-- ============================================================
-- Reconcile Live schema with Test (idempotent, additive only)
-- ============================================================

-- 1) Enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='referral_status') THEN
    CREATE TYPE public.referral_status AS ENUM ('pending','joined','rewarded');
  END IF;
END $$;

-- 2) Functions (safe to replace)
CREATE OR REPLACE FUNCTION public.get_or_create_open_session(_shop_id uuid)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $fn$
DECLARE v_session_id uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('register_session:' || _shop_id::text));
  SELECT id INTO v_session_id FROM public.register_sessions
  WHERE shop_id = _shop_id AND status = 'open' ORDER BY opened_at DESC LIMIT 1;
  IF v_session_id IS NULL THEN
    INSERT INTO public.register_sessions (shop_id, status) VALUES (_shop_id, 'open') RETURNING id INTO v_session_id;
  END IF;
  RETURN v_session_id;
END; $fn$;

CREATE OR REPLACE FUNCTION public.link_to_open_session()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $fn$
BEGIN
  IF NEW.session_id IS NULL AND NEW.user_id IS NOT NULL THEN
    NEW.session_id := public.get_or_create_open_session(NEW.user_id);
  END IF;
  RETURN NEW;
END; $fn$;

CREATE OR REPLACE FUNCTION public.close_register_session(_shop_id uuid, _report jsonb DEFAULT NULL::jsonb, _closed_by_name text DEFAULT NULL::text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $fn$
DECLARE
  v_closed_id uuid; v_ventes numeric := 0; v_reparations numeric := 0; v_depenses numeric := 0;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> _shop_id
     AND NOT public.is_team_member(_shop_id, auth.uid())
     AND NOT public.has_role(auth.uid(), 'platform_admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized to close this register';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('register_session:' || _shop_id::text));
  SELECT id INTO v_closed_id FROM public.register_sessions
  WHERE shop_id = _shop_id AND status = 'open' ORDER BY opened_at DESC LIMIT 1;
  IF v_closed_id IS NOT NULL THEN
    SELECT COALESCE(SUM(total_amount), 0) INTO v_ventes FROM public.sales WHERE session_id = v_closed_id;
    SELECT COALESCE(SUM(amount), 0) INTO v_reparations FROM public.repair_payments WHERE session_id = v_closed_id;
    SELECT COALESCE(SUM(amount), 0) INTO v_depenses FROM public.expenses WHERE session_id = v_closed_id;
    UPDATE public.register_sessions
    SET status='closed', closed_at=now(), snapshot_ventes=v_ventes, snapshot_reparations=v_reparations,
        snapshot_depenses=v_depenses, snapshot_net=v_ventes + v_reparations - v_depenses,
        report_data=_report, closed_by_name=_closed_by_name
    WHERE id = v_closed_id;
  END IF;
  INSERT INTO public.register_sessions (shop_id, status) VALUES (_shop_id, 'open');
  RETURN v_closed_id;
END; $fn$;

CREATE OR REPLACE FUNCTION public.generate_referral_code()
 RETURNS text LANGUAGE plpgsql SET search_path TO 'public'
AS $fn$
DECLARE
  alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; code text; i int; exists_already boolean;
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
END; $fn$;

CREATE OR REPLACE FUNCTION public.set_referral_code()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $fn$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := public.generate_referral_code();
  END IF;
  RETURN NEW;
END; $fn$;

CREATE OR REPLACE FUNCTION public.handle_referral_on_onboarding()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $fn$
BEGIN
  IF NEW.onboarding_completed = true AND COALESCE(OLD.onboarding_completed, false) = false THEN
    UPDATE public.referrals SET status = 'joined'
    WHERE referred_id = NEW.user_id AND status = 'pending';
  END IF;
  RETURN NEW;
END; $fn$;

CREATE OR REPLACE FUNCTION public.handle_service_request_update()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $fn$
BEGIN
  NEW.updated_at = now();
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    NEW.completed_at = now();
  END IF;
  RETURN NEW;
END; $fn$;

-- 3) Tables

-- customer_vault
CREATE TABLE IF NOT EXISTS public.customer_vault (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  account_type text NOT NULL,
  email_id text NOT NULL,
  password text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_vault TO authenticated;
GRANT ALL ON public.customer_vault TO service_role;
ALTER TABLE public.customer_vault ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner or team can manage customer_vault" ON public.customer_vault;
CREATE POLICY "Owner or team can manage customer_vault" ON public.customer_vault FOR ALL TO authenticated
  USING ((auth.uid() = user_id) OR is_team_member(user_id, auth.uid()))
  WITH CHECK ((auth.uid() = user_id) OR is_team_member(user_id, auth.uid()));
DROP POLICY IF EXISTS "Owner or team can view customer_vault" ON public.customer_vault;
CREATE POLICY "Owner or team can view customer_vault" ON public.customer_vault FOR SELECT TO authenticated
  USING ((auth.uid() = user_id) OR is_team_member(user_id, auth.uid()));
DROP POLICY IF EXISTS "Platform admin can view all customer_vault" ON public.customer_vault;
CREATE POLICY "Platform admin can view all customer_vault" ON public.customer_vault FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'platform_admin'::app_role));

-- referrals
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referred_id uuid,
  referred_email text,
  status referral_status NOT NULL DEFAULT 'pending',
  ip_fingerprint text,
  reward_granted_at timestamptz,
  rewarded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Platform admins manage referrals" ON public.referrals;
CREATE POLICY "Platform admins manage referrals" ON public.referrals FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'platform_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'platform_admin'::app_role));
DROP POLICY IF EXISTS "Referred user can insert their referral" ON public.referrals;
CREATE POLICY "Referred user can insert their referral" ON public.referrals FOR INSERT TO authenticated
  WITH CHECK (referred_id = auth.uid());
DROP POLICY IF EXISTS "Referrers can view their referrals" ON public.referrals;
CREATE POLICY "Referrers can view their referrals" ON public.referrals FOR SELECT TO authenticated
  USING ((referrer_id = auth.uid()) OR has_role(auth.uid(), 'platform_admin'::app_role));

-- register_sessions
CREATE TABLE IF NOT EXISTS public.register_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  snapshot_ventes numeric NOT NULL DEFAULT 0,
  snapshot_reparations numeric NOT NULL DEFAULT 0,
  snapshot_depenses numeric NOT NULL DEFAULT 0,
  snapshot_net numeric NOT NULL DEFAULT 0,
  report_data jsonb,
  closed_by_name text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.register_sessions TO authenticated;
GRANT ALL ON public.register_sessions TO service_role;
ALTER TABLE public.register_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner or team can manage register sessions" ON public.register_sessions;
CREATE POLICY "Owner or team can manage register sessions" ON public.register_sessions FOR ALL
  USING ((auth.uid() = shop_id) OR is_team_member(shop_id, auth.uid()))
  WITH CHECK ((auth.uid() = shop_id) OR is_team_member(shop_id, auth.uid()));
DROP POLICY IF EXISTS "Platform admin can view all register sessions" ON public.register_sessions;
CREATE POLICY "Platform admin can view all register sessions" ON public.register_sessions FOR SELECT
  USING (has_role(auth.uid(), 'platform_admin'::app_role));

-- repair_payments
CREATE TABLE IF NOT EXISTS public.repair_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  repair_id uuid NOT NULL,
  customer_id uuid,
  amount numeric NOT NULL DEFAULT 0,
  note text,
  recorded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  payment_type text NOT NULL DEFAULT 'none',
  session_id uuid
);
ALTER TABLE public.repair_payments ADD COLUMN IF NOT EXISTS payment_type text NOT NULL DEFAULT 'none';
ALTER TABLE public.repair_payments ADD COLUMN IF NOT EXISTS session_id uuid;
ALTER TABLE public.repair_payments DROP CONSTRAINT IF EXISTS repair_payments_payment_type_check;
ALTER TABLE public.repair_payments ADD CONSTRAINT repair_payments_payment_type_check CHECK (payment_type IN ('full','partial','already_paid','none'));
CREATE INDEX IF NOT EXISTS idx_repair_payments_repair ON public.repair_payments(repair_id);
CREATE INDEX IF NOT EXISTS idx_repair_payments_customer ON public.repair_payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_repair_payments_user ON public.repair_payments(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.repair_payments TO authenticated;
GRANT ALL ON public.repair_payments TO service_role;
ALTER TABLE public.repair_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner or team can manage repair payments" ON public.repair_payments;
CREATE POLICY "Owner or team can manage repair payments" ON public.repair_payments FOR ALL TO authenticated
  USING ((auth.uid() = user_id) OR is_team_member(user_id, auth.uid()))
  WITH CHECK ((auth.uid() = user_id) OR is_team_member(user_id, auth.uid()));
DROP POLICY IF EXISTS "Owner or team can view repair payments" ON public.repair_payments;
CREATE POLICY "Owner or team can view repair payments" ON public.repair_payments FOR SELECT TO authenticated
  USING ((auth.uid() = user_id) OR is_team_member(user_id, auth.uid()));
DROP POLICY IF EXISTS "Platform admin can view all repair_payments" ON public.repair_payments;
CREATE POLICY "Platform admin can view all repair_payments" ON public.repair_payments FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'platform_admin'::app_role));

-- services
CREATE TABLE IF NOT EXISTS public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'service' CHECK (type IN ('service','tool_rental')),
  category text NOT NULL DEFAULT 'other',
  price numeric NOT NULL DEFAULT 0,
  currency text,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  requires_imei boolean NOT NULL DEFAULT false,
  requires_model boolean NOT NULL DEFAULT false,
  extra_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT ALL ON public.services TO service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can view active services" ON public.services;
CREATE POLICY "Authenticated can view active services" ON public.services FOR SELECT TO authenticated
  USING (is_active = true OR has_role(auth.uid(), 'platform_admin'::app_role));
DROP POLICY IF EXISTS "Platform admins manage services" ON public.services;
CREATE POLICY "Platform admins manage services" ON public.services FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'platform_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'platform_admin'::app_role));

-- service_requests
CREATE TABLE IF NOT EXISTS public.service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL,
  requested_by uuid,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  service_name_snapshot text NOT NULL,
  service_price_snapshot numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','cancelled')),
  input_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  admin_note text,
  result_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_service_requests_shop ON public.service_requests(shop_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON public.service_requests(status);
CREATE INDEX IF NOT EXISTS idx_service_requests_created ON public.service_requests(created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_requests TO authenticated;
GRANT ALL ON public.service_requests TO service_role;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner or team can view service requests" ON public.service_requests;
CREATE POLICY "Owner or team can view service requests" ON public.service_requests FOR SELECT TO authenticated
  USING (auth.uid() = shop_id OR is_team_member(shop_id, auth.uid()));
DROP POLICY IF EXISTS "Owner or team can create service requests" ON public.service_requests;
CREATE POLICY "Owner or team can create service requests" ON public.service_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = shop_id OR is_team_member(shop_id, auth.uid()));
DROP POLICY IF EXISTS "Owner or team can cancel own pending" ON public.service_requests;
CREATE POLICY "Owner or team can cancel own pending" ON public.service_requests FOR UPDATE TO authenticated
  USING (auth.uid() = shop_id OR is_team_member(shop_id, auth.uid()))
  WITH CHECK (auth.uid() = shop_id OR is_team_member(shop_id, auth.uid()));
DROP POLICY IF EXISTS "Platform admin can view all service requests" ON public.service_requests;
CREATE POLICY "Platform admin can view all service requests" ON public.service_requests FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'platform_admin'::app_role));
DROP POLICY IF EXISTS "Platform admin can update service requests" ON public.service_requests;
CREATE POLICY "Platform admin can update service requests" ON public.service_requests FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'platform_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'platform_admin'::app_role));
DROP POLICY IF EXISTS "Platform admin can delete service requests" ON public.service_requests;
CREATE POLICY "Platform admin can delete service requests" ON public.service_requests FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'platform_admin'::app_role));

-- subcategories
CREATE TABLE IF NOT EXISTS public.subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category_id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subcategories TO authenticated;
GRANT ALL ON public.subcategories TO service_role;
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner or team can manage subcategories" ON public.subcategories;
CREATE POLICY "Owner or team can manage subcategories" ON public.subcategories FOR ALL
  USING ((auth.uid() = user_id) OR is_team_member(user_id, auth.uid()));
DROP POLICY IF EXISTS "Owner or team can view subcategories" ON public.subcategories;
CREATE POLICY "Owner or team can view subcategories" ON public.subcategories FOR SELECT
  USING ((auth.uid() = user_id) OR is_team_member(user_id, auth.uid()));
DROP POLICY IF EXISTS "Platform admin can view all subcategories" ON public.subcategories;
CREATE POLICY "Platform admin can view all subcategories" ON public.subcategories FOR SELECT
  USING (has_role(auth.uid(), 'platform_admin'::app_role));

-- user_category_preferences
CREATE TABLE IF NOT EXISTS public.user_category_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category_id uuid NOT NULL,
  category_kind text NOT NULL DEFAULT 'main',
  bg_color text,
  text_size text,
  display_order integer,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_category_preferences TO authenticated;
GRANT ALL ON public.user_category_preferences TO service_role;
ALTER TABLE public.user_category_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage their own category preferences" ON public.user_category_preferences;
CREATE POLICY "Users manage their own category preferences" ON public.user_category_preferences FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4) Missing columns on existing tables
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS session_id uuid;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS subcategory_id uuid;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS language text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS signup_fingerprint text;
ALTER TABLE public.repairs ADD COLUMN IF NOT EXISTS device_unlock_code text;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS session_id uuid;
ALTER TABLE public.shop_subscriptions ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_referral_code_key ON public.profiles(referral_code) WHERE referral_code IS NOT NULL;

-- 5) Triggers (recreate to guarantee presence)
DROP TRIGGER IF EXISTS update_customer_vault_updated_at ON public.customer_vault;
CREATE TRIGGER update_customer_vault_updated_at BEFORE UPDATE ON public.customer_vault
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_referrals_updated_at ON public.referrals;
CREATE TRIGGER update_referrals_updated_at BEFORE UPDATE ON public.referrals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_category_preferences_updated_at ON public.user_category_preferences;
CREATE TRIGGER update_user_category_preferences_updated_at BEFORE UPDATE ON public.user_category_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_services_updated ON public.services;
CREATE TRIGGER trg_services_updated BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_service_requests_updated ON public.service_requests;
CREATE TRIGGER trg_service_requests_updated BEFORE UPDATE ON public.service_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_service_request_update();

DROP TRIGGER IF EXISTS link_session_sales ON public.sales;
CREATE TRIGGER link_session_sales BEFORE INSERT ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.link_to_open_session();

DROP TRIGGER IF EXISTS link_session_expenses ON public.expenses;
CREATE TRIGGER link_session_expenses BEFORE INSERT ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.link_to_open_session();

DROP TRIGGER IF EXISTS link_session_repair_payments ON public.repair_payments;
CREATE TRIGGER link_session_repair_payments BEFORE INSERT ON public.repair_payments
  FOR EACH ROW EXECUTE FUNCTION public.link_to_open_session();

DROP TRIGGER IF EXISTS trg_profiles_referral_code ON public.profiles;
CREATE TRIGGER trg_profiles_referral_code BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_referral_code();

DROP TRIGGER IF EXISTS trg_referral_on_onboarding ON public.shop_settings;
CREATE TRIGGER trg_referral_on_onboarding AFTER UPDATE ON public.shop_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_referral_on_onboarding();