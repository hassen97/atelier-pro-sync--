-- ============================================================
-- Catch-up migration: reconcile Live schema with Test after
-- workspace move. Fully idempotent (no-op on Test).
-- ============================================================

-- Enum used by referrals
DO $$ BEGIN
  CREATE TYPE public.referral_status AS ENUM ('pending','joined','rewarded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- Phase 1: tables ----------
CREATE TABLE IF NOT EXISTS public.register_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL,
  opened_at timestamp with time zone NOT NULL DEFAULT now(),
  closed_at timestamp with time zone,
  status text NOT NULL DEFAULT 'open'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  snapshot_ventes numeric NOT NULL DEFAULT 0,
  snapshot_reparations numeric NOT NULL DEFAULT 0,
  snapshot_depenses numeric NOT NULL DEFAULT 0,
  snapshot_net numeric NOT NULL DEFAULT 0,
  report_data jsonb,
  closed_by_name text
);
CREATE TABLE IF NOT EXISTS public.services (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'service'::text,
  category text NOT NULL DEFAULT 'other'::text,
  price numeric NOT NULL DEFAULT 0,
  currency text,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  requires_imei boolean NOT NULL DEFAULT false,
  requires_model boolean NOT NULL DEFAULT false,
  extra_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.subcategories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category_id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.customer_vault (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  account_type text NOT NULL,
  email_id text NOT NULL,
  password text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referred_id uuid,
  referred_email text,
  status referral_status NOT NULL DEFAULT 'pending'::referral_status,
  ip_fingerprint text,
  reward_granted_at timestamp with time zone,
  rewarded_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.repair_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  repair_id uuid NOT NULL,
  customer_id uuid,
  amount numeric NOT NULL DEFAULT 0,
  note text,
  recorded_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  payment_type text NOT NULL DEFAULT 'none'::text,
  session_id uuid
);
CREATE TABLE IF NOT EXISTS public.service_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL,
  requested_by uuid,
  service_id uuid,
  service_name_snapshot text NOT NULL,
  service_price_snapshot numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending'::text,
  input_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  admin_note text,
  result_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone
);
CREATE TABLE IF NOT EXISTS public.user_category_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category_id uuid NOT NULL,
  category_kind text NOT NULL DEFAULT 'main'::text,
  bg_color text,
  text_size text,
  display_order integer,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ---------- Phase 2: constraints ----------
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='register_sessions_pkey' AND conrelid='public.register_sessions'::regclass) THEN ALTER TABLE public.register_sessions ADD CONSTRAINT register_sessions_pkey PRIMARY KEY (id); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='register_sessions_status_check' AND conrelid='public.register_sessions'::regclass) THEN ALTER TABLE public.register_sessions ADD CONSTRAINT register_sessions_status_check CHECK ((status = ANY (ARRAY['open'::text, 'closed'::text]))); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='services_pkey' AND conrelid='public.services'::regclass) THEN ALTER TABLE public.services ADD CONSTRAINT services_pkey PRIMARY KEY (id); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='services_type_check' AND conrelid='public.services'::regclass) THEN ALTER TABLE public.services ADD CONSTRAINT services_type_check CHECK ((type = ANY (ARRAY['service'::text, 'tool_rental'::text]))); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='subcategories_pkey' AND conrelid='public.subcategories'::regclass) THEN ALTER TABLE public.subcategories ADD CONSTRAINT subcategories_pkey PRIMARY KEY (id); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='subcategories_category_id_fkey' AND conrelid='public.subcategories'::regclass) THEN ALTER TABLE public.subcategories ADD CONSTRAINT subcategories_category_id_fkey FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='customer_vault_account_type_check' AND conrelid='public.customer_vault'::regclass) THEN ALTER TABLE public.customer_vault ADD CONSTRAINT customer_vault_account_type_check CHECK ((account_type = ANY (ARRAY['icloud'::text, 'google'::text, 'samsung'::text]))); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='customer_vault_pkey' AND conrelid='public.customer_vault'::regclass) THEN ALTER TABLE public.customer_vault ADD CONSTRAINT customer_vault_pkey PRIMARY KEY (id); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='customer_vault_customer_id_fkey' AND conrelid='public.customer_vault'::regclass) THEN ALTER TABLE public.customer_vault ADD CONSTRAINT customer_vault_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='referrals_pkey' AND conrelid='public.referrals'::regclass) THEN ALTER TABLE public.referrals ADD CONSTRAINT referrals_pkey PRIMARY KEY (id); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='referrals_referred_id_fkey' AND conrelid='public.referrals'::regclass) THEN ALTER TABLE public.referrals ADD CONSTRAINT referrals_referred_id_fkey FOREIGN KEY (referred_id) REFERENCES auth.users(id) ON DELETE SET NULL; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='referrals_referrer_id_fkey' AND conrelid='public.referrals'::regclass) THEN ALTER TABLE public.referrals ADD CONSTRAINT referrals_referrer_id_fkey FOREIGN KEY (referrer_id) REFERENCES auth.users(id) ON DELETE CASCADE; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='repair_payments_payment_type_check' AND conrelid='public.repair_payments'::regclass) THEN ALTER TABLE public.repair_payments ADD CONSTRAINT repair_payments_payment_type_check CHECK ((payment_type = ANY (ARRAY['full'::text, 'partial'::text, 'already_paid'::text, 'none'::text]))); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='repair_payments_pkey' AND conrelid='public.repair_payments'::regclass) THEN ALTER TABLE public.repair_payments ADD CONSTRAINT repair_payments_pkey PRIMARY KEY (id); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='repair_payments_session_id_fkey' AND conrelid='public.repair_payments'::regclass) THEN ALTER TABLE public.repair_payments ADD CONSTRAINT repair_payments_session_id_fkey FOREIGN KEY (session_id) REFERENCES register_sessions(id) ON DELETE SET NULL; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='service_requests_pkey' AND conrelid='public.service_requests'::regclass) THEN ALTER TABLE public.service_requests ADD CONSTRAINT service_requests_pkey PRIMARY KEY (id); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='service_requests_status_check' AND conrelid='public.service_requests'::regclass) THEN ALTER TABLE public.service_requests ADD CONSTRAINT service_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text]))); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='service_requests_service_id_fkey' AND conrelid='public.service_requests'::regclass) THEN ALTER TABLE public.service_requests ADD CONSTRAINT service_requests_service_id_fkey FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='user_category_preferences_pkey' AND conrelid='public.user_category_preferences'::regclass) THEN ALTER TABLE public.user_category_preferences ADD CONSTRAINT user_category_preferences_pkey PRIMARY KEY (id); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='user_category_preferences_user_id_category_id_key' AND conrelid='public.user_category_preferences'::regclass) THEN ALTER TABLE public.user_category_preferences ADD CONSTRAINT user_category_preferences_user_id_category_id_key UNIQUE (user_id, category_id); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='user_category_preferences_user_id_fkey' AND conrelid='public.user_category_preferences'::regclass) THEN ALTER TABLE public.user_category_preferences ADD CONSTRAINT user_category_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE; END IF; END $$;

-- ---------- Phase 3: indexes ----------
CREATE UNIQUE INDEX IF NOT EXISTS register_sessions_one_open_per_shop ON public.register_sessions USING btree (shop_id) WHERE (status = 'open'::text);
CREATE INDEX IF NOT EXISTS register_sessions_shop_idx ON public.register_sessions USING btree (shop_id, status);
CREATE INDEX IF NOT EXISTS idx_subcategories_user_id ON public.subcategories USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_subcategories_category_id ON public.subcategories USING btree (category_id);
CREATE INDEX IF NOT EXISTS idx_customer_vault_customer ON public.customer_vault USING btree (customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_vault_user ON public.customer_vault USING btree (user_id);
CREATE INDEX IF NOT EXISTS referrals_referrer_id_idx ON public.referrals USING btree (referrer_id);
CREATE INDEX IF NOT EXISTS referrals_status_idx ON public.referrals USING btree (status);
CREATE INDEX IF NOT EXISTS referrals_referred_id_idx ON public.referrals USING btree (referred_id);
CREATE INDEX IF NOT EXISTS idx_repair_payments_repair_id ON public.repair_payments USING btree (repair_id);
CREATE INDEX IF NOT EXISTS idx_repair_payments_user ON public.repair_payments USING btree (user_id);
CREATE INDEX IF NOT EXISTS repair_payments_session_idx ON public.repair_payments USING btree (session_id);
CREATE INDEX IF NOT EXISTS idx_repair_payments_user_id ON public.repair_payments USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_repair_payments_customer ON public.repair_payments USING btree (customer_id);
CREATE INDEX IF NOT EXISTS idx_repair_payments_repair ON public.repair_payments USING btree (repair_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON public.service_requests USING btree (status);
CREATE INDEX IF NOT EXISTS idx_service_requests_created ON public.service_requests USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_requests_shop ON public.service_requests USING btree (shop_id);

-- ---------- Phase 4: RLS + grants ----------
ALTER TABLE public.register_sessions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.register_sessions TO authenticated; GRANT ALL ON public.register_sessions TO service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated; GRANT ALL ON public.services TO service_role;
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subcategories TO authenticated; GRANT ALL ON public.subcategories TO service_role;
ALTER TABLE public.customer_vault ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_vault TO authenticated; GRANT ALL ON public.customer_vault TO service_role;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.referrals TO authenticated; GRANT ALL ON public.referrals TO service_role;
ALTER TABLE public.repair_payments ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.repair_payments TO authenticated; GRANT ALL ON public.repair_payments TO service_role;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_requests TO authenticated; GRANT ALL ON public.service_requests TO service_role;
ALTER TABLE public.user_category_preferences ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_category_preferences TO authenticated; GRANT ALL ON public.user_category_preferences TO service_role;

-- ---------- Phase 5: missing columns on existing tables ----------
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS session_id uuid;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS session_id uuid;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS subcategory_id uuid;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS signup_fingerprint text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.shop_subscriptions ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='sales_session_id_fkey' AND conrelid='public.sales'::regclass) THEN ALTER TABLE public.sales ADD CONSTRAINT sales_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.register_sessions(id) ON DELETE SET NULL; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='expenses_session_id_fkey' AND conrelid='public.expenses'::regclass) THEN ALTER TABLE public.expenses ADD CONSTRAINT expenses_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.register_sessions(id) ON DELETE SET NULL; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='products_subcategory_id_fkey' AND conrelid='public.products'::regclass) THEN ALTER TABLE public.products ADD CONSTRAINT products_subcategory_id_fkey FOREIGN KEY (subcategory_id) REFERENCES public.subcategories(id) ON DELETE SET NULL; END IF; END $$;

CREATE INDEX IF NOT EXISTS sales_session_idx ON public.sales (session_id);
CREATE INDEX IF NOT EXISTS expenses_session_idx ON public.expenses (session_id);
CREATE UNIQUE INDEX IF NOT EXISTS profiles_referral_code_key ON public.profiles (referral_code) WHERE referral_code IS NOT NULL;

-- ---------- Phase 6: functions ----------
CREATE OR REPLACE FUNCTION public.close_register_session(_shop_id uuid, _report jsonb DEFAULT NULL::jsonb, _closed_by_name text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_closed_id uuid;
  v_ventes numeric := 0;
  v_reparations numeric := 0;
  v_depenses numeric := 0;
BEGIN
  IF auth.uid() IS NOT NULL
     AND auth.uid() <> _shop_id
     AND NOT public.is_team_member(_shop_id, auth.uid())
     AND NOT public.has_role(auth.uid(), 'platform_admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized to close this register';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('register_session:' || _shop_id::text));

  SELECT id INTO v_closed_id
  FROM public.register_sessions
  WHERE shop_id = _shop_id AND status = 'open'
  ORDER BY opened_at DESC
  LIMIT 1;

  IF v_closed_id IS NOT NULL THEN
    SELECT COALESCE(SUM(total_amount), 0) INTO v_ventes
    FROM public.sales WHERE session_id = v_closed_id;

    SELECT COALESCE(SUM(amount), 0) INTO v_reparations
    FROM public.repair_payments WHERE session_id = v_closed_id;

    SELECT COALESCE(SUM(amount), 0) INTO v_depenses
    FROM public.expenses WHERE session_id = v_closed_id;

    UPDATE public.register_sessions
    SET status = 'closed',
        closed_at = now(),
        snapshot_ventes = v_ventes,
        snapshot_reparations = v_reparations,
        snapshot_depenses = v_depenses,
        snapshot_net = v_ventes + v_reparations - v_depenses,
        report_data = _report,
        closed_by_name = _closed_by_name
    WHERE id = v_closed_id;
  END IF;

  INSERT INTO public.register_sessions (shop_id, status)
  VALUES (_shop_id, 'open');

  RETURN v_closed_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_referral_code()
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.get_or_create_open_session(_shop_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_session_id uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('register_session:' || _shop_id::text));

  SELECT id INTO v_session_id
  FROM public.register_sessions
  WHERE shop_id = _shop_id AND status = 'open'
  ORDER BY opened_at DESC
  LIMIT 1;

  IF v_session_id IS NULL THEN
    INSERT INTO public.register_sessions (shop_id, status)
    VALUES (_shop_id, 'open')
    RETURNING id INTO v_session_id;
  END IF;

  RETURN v_session_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_referral_on_onboarding()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.handle_service_request_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    NEW.completed_at = now();
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.link_to_open_session()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.session_id IS NULL AND NEW.user_id IS NOT NULL THEN
    NEW.session_id := public.get_or_create_open_session(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_referral_code()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := public.generate_referral_code();
  END IF;
  RETURN NEW;
END;
$function$;

-- ---------- Phase 7: triggers ----------
DROP TRIGGER IF EXISTS update_customer_vault_updated_at ON public.customer_vault;
CREATE TRIGGER update_customer_vault_updated_at BEFORE UPDATE ON public.customer_vault FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS link_session_expenses ON public.expenses;
CREATE TRIGGER link_session_expenses BEFORE INSERT ON public.expenses FOR EACH ROW EXECUTE FUNCTION link_to_open_session();
DROP TRIGGER IF EXISTS update_referrals_updated_at ON public.referrals;
CREATE TRIGGER update_referrals_updated_at BEFORE UPDATE ON public.referrals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS link_session_repair_payments ON public.repair_payments;
CREATE TRIGGER link_session_repair_payments BEFORE INSERT ON public.repair_payments FOR EACH ROW EXECUTE FUNCTION link_to_open_session();
DROP TRIGGER IF EXISTS link_session_sales ON public.sales;
CREATE TRIGGER link_session_sales BEFORE INSERT ON public.sales FOR EACH ROW EXECUTE FUNCTION link_to_open_session();
DROP TRIGGER IF EXISTS trg_sale_activity ON public.sales;
CREATE TRIGGER trg_sale_activity AFTER INSERT ON public.sales FOR EACH ROW EXECUTE FUNCTION log_sale_activity();
DROP TRIGGER IF EXISTS trg_service_requests_updated ON public.service_requests;
CREATE TRIGGER trg_service_requests_updated BEFORE UPDATE ON public.service_requests FOR EACH ROW EXECUTE FUNCTION handle_service_request_update();
DROP TRIGGER IF EXISTS trg_services_updated ON public.services;
CREATE TRIGGER trg_services_updated BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_user_category_preferences_updated_at ON public.user_category_preferences;
CREATE TRIGGER update_user_category_preferences_updated_at BEFORE UPDATE ON public.user_category_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------- Phase 8: RLS policies ----------
DROP POLICY IF EXISTS "Owner or team can manage customer_vault" ON public.customer_vault;
CREATE POLICY "Owner or team can manage customer_vault" ON public.customer_vault AS PERMISSIVE FOR ALL TO authenticated USING (((auth.uid() = user_id) OR is_team_member(user_id, auth.uid()))) WITH CHECK (((auth.uid() = user_id) OR is_team_member(user_id, auth.uid())));
DROP POLICY IF EXISTS "Owner or team can view customer_vault" ON public.customer_vault;
CREATE POLICY "Owner or team can view customer_vault" ON public.customer_vault AS PERMISSIVE FOR SELECT TO authenticated USING (((auth.uid() = user_id) OR is_team_member(user_id, auth.uid())));
DROP POLICY IF EXISTS "Platform admin can view all customer_vault" ON public.customer_vault;
CREATE POLICY "Platform admin can view all customer_vault" ON public.customer_vault AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'platform_admin'::app_role));
DROP POLICY IF EXISTS "Platform admins manage referrals" ON public.referrals;
CREATE POLICY "Platform admins manage referrals" ON public.referrals AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'platform_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'platform_admin'::app_role));
DROP POLICY IF EXISTS "Referred user can insert their referral" ON public.referrals;
CREATE POLICY "Referred user can insert their referral" ON public.referrals AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((referred_id = auth.uid()));
DROP POLICY IF EXISTS "Referrers can view their referrals" ON public.referrals;
CREATE POLICY "Referrers can view their referrals" ON public.referrals AS PERMISSIVE FOR SELECT TO authenticated USING (((referrer_id = auth.uid()) OR has_role(auth.uid(), 'platform_admin'::app_role)));
DROP POLICY IF EXISTS "Owner or team can manage register sessions" ON public.register_sessions;
CREATE POLICY "Owner or team can manage register sessions" ON public.register_sessions AS PERMISSIVE FOR ALL TO public USING (((auth.uid() = shop_id) OR is_team_member(shop_id, auth.uid()))) WITH CHECK (((auth.uid() = shop_id) OR is_team_member(shop_id, auth.uid())));
DROP POLICY IF EXISTS "Platform admin can view all register sessions" ON public.register_sessions;
CREATE POLICY "Platform admin can view all register sessions" ON public.register_sessions AS PERMISSIVE FOR SELECT TO public USING (has_role(auth.uid(), 'platform_admin'::app_role));
DROP POLICY IF EXISTS "Owner or team can manage repair payments" ON public.repair_payments;
CREATE POLICY "Owner or team can manage repair payments" ON public.repair_payments AS PERMISSIVE FOR ALL TO authenticated USING (((auth.uid() = user_id) OR is_team_member(user_id, auth.uid()))) WITH CHECK (((auth.uid() = user_id) OR is_team_member(user_id, auth.uid())));
DROP POLICY IF EXISTS "Owner or team can view repair payments" ON public.repair_payments;
CREATE POLICY "Owner or team can view repair payments" ON public.repair_payments AS PERMISSIVE FOR SELECT TO authenticated USING (((auth.uid() = user_id) OR is_team_member(user_id, auth.uid())));
DROP POLICY IF EXISTS "Platform admin can view all repair_payments" ON public.repair_payments;
CREATE POLICY "Platform admin can view all repair_payments" ON public.repair_payments AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'platform_admin'::app_role));
DROP POLICY IF EXISTS "Owner or team can cancel own pending" ON public.service_requests;
CREATE POLICY "Owner or team can cancel own pending" ON public.service_requests AS PERMISSIVE FOR UPDATE TO authenticated USING (((auth.uid() = shop_id) OR is_team_member(shop_id, auth.uid()))) WITH CHECK (((auth.uid() = shop_id) OR is_team_member(shop_id, auth.uid())));
DROP POLICY IF EXISTS "Owner or team can create service requests" ON public.service_requests;
CREATE POLICY "Owner or team can create service requests" ON public.service_requests AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((auth.uid() = shop_id) OR is_team_member(shop_id, auth.uid())));
DROP POLICY IF EXISTS "Owner or team can view service requests" ON public.service_requests;
CREATE POLICY "Owner or team can view service requests" ON public.service_requests AS PERMISSIVE FOR SELECT TO authenticated USING (((auth.uid() = shop_id) OR is_team_member(shop_id, auth.uid())));
DROP POLICY IF EXISTS "Platform admin can delete service requests" ON public.service_requests;
CREATE POLICY "Platform admin can delete service requests" ON public.service_requests AS PERMISSIVE FOR DELETE TO authenticated USING (has_role(auth.uid(), 'platform_admin'::app_role));
DROP POLICY IF EXISTS "Platform admin can update service requests" ON public.service_requests;
CREATE POLICY "Platform admin can update service requests" ON public.service_requests AS PERMISSIVE FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'platform_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'platform_admin'::app_role));
DROP POLICY IF EXISTS "Platform admin can view all service requests" ON public.service_requests;
CREATE POLICY "Platform admin can view all service requests" ON public.service_requests AS PERMISSIVE FOR SELECT TO authenticated USING (has_role(auth.uid(), 'platform_admin'::app_role));
DROP POLICY IF EXISTS "Authenticated can view active services" ON public.services;
CREATE POLICY "Authenticated can view active services" ON public.services AS PERMISSIVE FOR SELECT TO authenticated USING (((is_active = true) OR has_role(auth.uid(), 'platform_admin'::app_role)));
DROP POLICY IF EXISTS "Platform admins manage services" ON public.services;
CREATE POLICY "Platform admins manage services" ON public.services AS PERMISSIVE FOR ALL TO authenticated USING (has_role(auth.uid(), 'platform_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'platform_admin'::app_role));
DROP POLICY IF EXISTS "Owner or team can manage subcategories" ON public.subcategories;
CREATE POLICY "Owner or team can manage subcategories" ON public.subcategories AS PERMISSIVE FOR ALL TO public USING (((auth.uid() = user_id) OR is_team_member(user_id, auth.uid())));
DROP POLICY IF EXISTS "Owner or team can view subcategories" ON public.subcategories;
CREATE POLICY "Owner or team can view subcategories" ON public.subcategories AS PERMISSIVE FOR SELECT TO public USING (((auth.uid() = user_id) OR is_team_member(user_id, auth.uid())));
DROP POLICY IF EXISTS "Platform admin can view all subcategories" ON public.subcategories;
CREATE POLICY "Platform admin can view all subcategories" ON public.subcategories AS PERMISSIVE FOR SELECT TO public USING (has_role(auth.uid(), 'platform_admin'::app_role));
DROP POLICY IF EXISTS "Users manage their own category preferences" ON public.user_category_preferences;
CREATE POLICY "Users manage their own category preferences" ON public.user_category_preferences AS PERMISSIVE FOR ALL TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));