CREATE OR REPLACE FUNCTION public.guard_customer_loyalty_points()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_setting('app.loyalty_rpc', true) = 'on' OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    NEW.loyalty_points := OLD.loyalty_points;
  ELSIF TG_OP = 'INSERT' AND auth.uid() <> NEW.user_id THEN
    NEW.loyalty_points := 0;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_guard_customer_loyalty ON public.customers;
CREATE TRIGGER trg_guard_customer_loyalty BEFORE INSERT OR UPDATE ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.guard_customer_loyalty_points();

DROP POLICY IF EXISTS "Owner or team can insert loyalty_transactions" ON public.loyalty_transactions;

CREATE OR REPLACE FUNCTION public.loyalty_adjust(_customer_id uuid, _points integer, _note text DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_owner uuid; v_bal integer;
BEGIN
  SELECT user_id INTO v_owner FROM customers WHERE id = _customer_id;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'Client introuvable'; END IF;
  IF auth.uid() IS NULL OR (auth.uid() <> v_owner AND NOT has_role(auth.uid(), 'platform_admin'::app_role)) THEN
    RAISE EXCEPTION 'Seul le propriétaire peut ajuster les points';
  END IF;
  IF _points IS NULL OR _points = 0 OR abs(_points) > 100000 THEN
    RAISE EXCEPTION 'Montant de points invalide';
  END IF;
  PERFORM set_config('app.loyalty_rpc', 'on', true);
  UPDATE customers SET loyalty_points = GREATEST(0, loyalty_points + _points)
   WHERE id = _customer_id RETURNING loyalty_points INTO v_bal;
  INSERT INTO loyalty_transactions (user_id, customer_id, type, amount_points, source, note, created_by)
  VALUES (v_owner, _customer_id, 'adjustment', _points, 'manual', left(_note, 500), auth.uid());
  PERFORM set_config('app.loyalty_rpc', 'off', true);
  RETURN v_bal;
END $$;

CREATE OR REPLACE FUNCTION public.loyalty_earn_sale(_sale_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_sale record; v_set record; v_pts integer;
BEGIN
  SELECT id, user_id, customer_id, amount_paid INTO v_sale FROM sales WHERE id = _sale_id;
  IF v_sale.id IS NULL OR v_sale.customer_id IS NULL THEN RETURN 0; END IF;
  IF auth.uid() IS NULL OR (auth.uid() <> v_sale.user_id AND NOT is_team_member(v_sale.user_id, auth.uid())) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF EXISTS (SELECT 1 FROM loyalty_transactions WHERE sale_id = _sale_id AND type = 'earned') THEN RETURN 0; END IF;
  SELECT loyalty_enabled, loyalty_earn_rate INTO v_set FROM shop_settings WHERE user_id = v_sale.user_id;
  IF NOT COALESCE(v_set.loyalty_enabled, false) THEN RETURN 0; END IF;
  v_pts := floor(GREATEST(v_sale.amount_paid, 0) * COALESCE(v_set.loyalty_earn_rate, 0));
  IF v_pts <= 0 THEN RETURN 0; END IF;
  PERFORM set_config('app.loyalty_rpc', 'on', true);
  UPDATE customers SET loyalty_points = loyalty_points + v_pts WHERE id = v_sale.customer_id AND user_id = v_sale.user_id;
  INSERT INTO loyalty_transactions (user_id, customer_id, type, amount_points, amount_money, source, sale_id, created_by)
  VALUES (v_sale.user_id, v_sale.customer_id, 'earned', v_pts, v_sale.amount_paid, 'sale', _sale_id, auth.uid());
  PERFORM set_config('app.loyalty_rpc', 'off', true);
  RETURN v_pts;
END $$;

CREATE OR REPLACE FUNCTION public.loyalty_earn_repair(_repair_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_r record; v_set record; v_pts integer;
BEGIN
  SELECT id, user_id, customer_id, status, total_cost, amount_paid INTO v_r FROM repairs WHERE id = _repair_id;
  IF v_r.id IS NULL OR v_r.customer_id IS NULL THEN RETURN 0; END IF;
  IF auth.uid() IS NULL OR (auth.uid() <> v_r.user_id AND NOT is_team_member(v_r.user_id, auth.uid())) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF v_r.status <> 'delivered' OR COALESCE(v_r.total_cost,0) <= 0 OR COALESCE(v_r.amount_paid,0) + 0.001 < v_r.total_cost THEN RETURN 0; END IF;
  IF EXISTS (SELECT 1 FROM loyalty_transactions WHERE repair_id = _repair_id AND type = 'earned') THEN RETURN 0; END IF;
  SELECT loyalty_enabled, loyalty_earn_rate INTO v_set FROM shop_settings WHERE user_id = v_r.user_id;
  IF NOT COALESCE(v_set.loyalty_enabled, false) THEN RETURN 0; END IF;
  v_pts := floor(v_r.total_cost * COALESCE(v_set.loyalty_earn_rate, 1));
  IF v_pts <= 0 THEN RETURN 0; END IF;
  PERFORM set_config('app.loyalty_rpc', 'on', true);
  UPDATE customers SET loyalty_points = loyalty_points + v_pts WHERE id = v_r.customer_id AND user_id = v_r.user_id;
  INSERT INTO loyalty_transactions (user_id, customer_id, type, amount_points, amount_money, source, repair_id, created_by)
  VALUES (v_r.user_id, v_r.customer_id, 'earned', v_pts, v_r.total_cost, 'repair', _repair_id, auth.uid());
  PERFORM set_config('app.loyalty_rpc', 'off', true);
  RETURN v_pts;
END $$;

CREATE OR REPLACE FUNCTION public.loyalty_redeem(_sale_id uuid, _points integer, _discount numeric DEFAULT 0)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_sale record; v_bal integer;
BEGIN
  SELECT id, user_id, customer_id INTO v_sale FROM sales WHERE id = _sale_id;
  IF v_sale.id IS NULL OR v_sale.customer_id IS NULL THEN RAISE EXCEPTION 'Vente introuvable'; END IF;
  IF auth.uid() IS NULL OR (auth.uid() <> v_sale.user_id AND NOT is_team_member(v_sale.user_id, auth.uid())) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF _points IS NULL OR _points <= 0 THEN RAISE EXCEPTION 'Points invalides'; END IF;
  IF EXISTS (SELECT 1 FROM loyalty_transactions WHERE sale_id = _sale_id AND type = 'redeemed') THEN
    SELECT loyalty_points INTO v_bal FROM customers WHERE id = v_sale.customer_id; RETURN v_bal;
  END IF;
  SELECT loyalty_points INTO v_bal FROM customers WHERE id = v_sale.customer_id FOR UPDATE;
  IF _points > COALESCE(v_bal, 0) THEN RAISE EXCEPTION 'Solde de points insuffisant'; END IF;
  PERFORM set_config('app.loyalty_rpc', 'on', true);
  UPDATE customers SET loyalty_points = loyalty_points - _points WHERE id = v_sale.customer_id RETURNING loyalty_points INTO v_bal;
  INSERT INTO loyalty_transactions (user_id, customer_id, type, amount_points, amount_money, source, sale_id, created_by)
  VALUES (v_sale.user_id, v_sale.customer_id, 'redeemed', -_points, GREATEST(COALESCE(_discount,0),0), 'sale', _sale_id, auth.uid());
  PERFORM set_config('app.loyalty_rpc', 'off', true);
  RETURN v_bal;
END $$;

CREATE OR REPLACE FUNCTION public.generate_inventory_access_code()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_code text; v_exp timestamptz := now() + interval '4 hours';
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Non authentifié'; END IF;
  IF EXISTS (SELECT 1 FROM team_members WHERE member_user_id = auth.uid() AND status = 'active') THEN
    RAISE EXCEPTION 'Réservé au propriétaire';
  END IF;
  v_code := lpad(((('x' || encode(gen_random_bytes(4), 'hex'))::bit(32)::bigint) % 1000000)::text, 6, '0');
  UPDATE inventory_access_codes SET expires_at = now() WHERE user_id = auth.uid() AND used_by IS NULL AND expires_at > now();
  INSERT INTO inventory_access_codes (user_id, code, expires_at) VALUES (auth.uid(), v_code, v_exp);
  RETURN jsonb_build_object('code', v_code, 'expires_at', v_exp);
END $$;

REVOKE ALL ON FUNCTION public.loyalty_adjust(uuid, integer, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.loyalty_earn_sale(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.loyalty_earn_repair(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.loyalty_redeem(uuid, integer, numeric) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.generate_inventory_access_code() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.loyalty_adjust(uuid, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.loyalty_earn_sale(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.loyalty_earn_repair(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.loyalty_redeem(uuid, integer, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_inventory_access_code() TO authenticated;