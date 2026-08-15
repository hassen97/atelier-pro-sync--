-- Performance hotpath fixes: indexes, atomic checkout, stats aggregation, unpaid view.

-- ==================== 1) Missing indexes ====================
CREATE INDEX IF NOT EXISTS idx_products_user_qty      ON public.products(user_id, quantity);
CREATE INDEX IF NOT EXISTS idx_products_user_name     ON public.products(user_id, name);
CREATE INDEX IF NOT EXISTS idx_customers_user_created ON public.customers(user_id, created_at DESC);

-- ==================== 2) Atomic checkout ====================
-- Replaces the client-side waterfall (1 insert + 1 items insert + 2N stock
-- round-trips). Single transaction; row-locked stock decrement kills the
-- concurrent-oversell race. Stock MAY go negative (existing business behavior
-- is preserved — shops sell items they didn't count yet).
CREATE OR REPLACE FUNCTION public.create_sale(
  _shop_id       uuid,
  _items         jsonb,
  _customer_id   uuid    DEFAULT NULL,
  _payment_method text   DEFAULT 'cash',
  _total_amount  numeric DEFAULT 0,
  _amount_paid   numeric DEFAULT 0,
  _notes         text    DEFAULT NULL,
  _session_id    uuid    DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_sale_id    uuid;
  v_item       jsonb;
  v_product_id uuid;
  v_qty        int;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  INSERT INTO public.sales (user_id, customer_id, total_amount, amount_paid, payment_method, notes, session_id)
  VALUES (_shop_id, _customer_id, _total_amount, _amount_paid, COALESCE(_payment_method, 'cash'), _notes, _session_id)
  RETURNING id INTO v_sale_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(_items, '[]'::jsonb)) LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_qty        := COALESCE((v_item->>'quantity')::int, 0);
    IF v_qty <= 0 THEN CONTINUE; END IF;

    -- Atomic decrement; the UPDATE locks the row, serialising concurrent sales.
    UPDATE public.products
       SET quantity   = quantity - v_qty,
           updated_at = now()
     WHERE id = v_product_id
       AND user_id = _shop_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Produit introuvable ou hors boutique: %', v_product_id;
    END IF;

    INSERT INTO public.sale_items (sale_id, product_id, quantity, unit_price)
    VALUES (v_sale_id, v_product_id, v_qty, COALESCE((v_item->>'unit_price')::numeric, 0));
  END LOOP;

  RETURN jsonb_build_object('sale_id', v_sale_id);
END;
$$;

-- ==================== 3) Server-side statistics ====================
-- One round-trip replaces 3 unbounded fetches + O(items×products) JS loops.
-- Monthly series ALWAYS covers the last 6 months (fixes the chart bug).
CREATE OR REPLACE FUNCTION public.statistics_report(
  _shop_id uuid,
  _start   timestamptz,
  _end     timestamptz
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_totals   jsonb;
  v_monthly  jsonb;
  v_top      jsonb;
  v_cat      jsonb;
  v_repair   jsonb;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  SELECT jsonb_build_object(
    'salesCount',     (SELECT count(*) FROM public.sales
                        WHERE user_id = _shop_id AND created_at >= _start AND created_at <= _end),
    'salesRevenue',   COALESCE((SELECT sum(total_amount) FROM public.sales
                        WHERE user_id = _shop_id AND created_at >= _start AND created_at <= _end), 0),
    'refundsTotal',   COALESCE((SELECT sum(refund_amount) FROM public.product_returns
                        WHERE user_id = _shop_id AND created_at >= _start AND created_at <= _end), 0),
    'repairsCount',   (SELECT count(*) FROM public.repairs
                        WHERE user_id = _shop_id AND created_at >= _start AND created_at <= _end),
    'repairsRevenue', COALESCE((SELECT sum(total_cost) FROM public.repairs
                        WHERE user_id = _shop_id AND created_at >= _start AND created_at <= _end), 0)
  ) INTO v_totals;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('month_start', gs.m, 'ventes', gs.v, 'reparations', gs.r) ORDER BY gs.m), '[]'::jsonb)
    INTO v_monthly
    FROM (
      SELECT d::date AS m,
        COALESCE((SELECT sum(s.total_amount) FROM public.sales s
                   WHERE s.user_id = _shop_id AND s.created_at >= d AND s.created_at < d + interval '1 month'), 0) AS v,
        COALESCE((SELECT sum(r.total_cost) FROM public.repairs r
                   WHERE r.user_id = _shop_id AND r.created_at >= d AND r.created_at < d + interval '1 month'), 0) AS r
      FROM generate_series(date_trunc('month', now()) - interval '5 months',
                           date_trunc('month', now()), interval '1 month') AS d
    ) gs;

  SELECT COALESCE(jsonb_agg(j ORDER BY (j->>'revenue')::numeric DESC), '[]'::jsonb)
    INTO v_top
    FROM (
      SELECT jsonb_build_object('name', p.name,
                                'sales', sum(si.quantity),
                                'revenue', sum(si.quantity * si.unit_price)) AS j
      FROM public.sale_items si
      JOIN public.sales s    ON s.id = si.sale_id
      JOIN public.products p ON p.id = si.product_id
      WHERE s.user_id = _shop_id AND s.created_at >= _start AND s.created_at <= _end
      GROUP BY p.id, p.name
      ORDER BY sum(si.quantity * si.unit_price) DESC
      LIMIT 8
    ) t;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('name', c.name, 'revenue', c.revenue) ORDER BY c.revenue DESC), '[]'::jsonb)
    INTO v_cat
    FROM (
      SELECT COALESCE(cat.name, 'Sans catégorie') AS name,
             sum(si.quantity * si.unit_price)     AS revenue
      FROM public.sale_items si
      JOIN public.sales s        ON s.id = si.sale_id
      JOIN public.products p     ON p.id = si.product_id
      LEFT JOIN public.categories cat ON cat.id = p.category_id
      WHERE s.user_id = _shop_id AND s.created_at >= _start AND s.created_at <= _end
      GROUP BY COALESCE(cat.name, 'Sans catégorie')
    ) c;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('type', t.kind, 'count', t.cnt) ORDER BY t.cnt DESC), '[]'::jsonb)
    INTO v_repair
    FROM (
      SELECT CASE
               WHEN problem_description ILIKE '%écran%' OR problem_description ILIKE '%ecran%' THEN 'Écran'
               WHEN problem_description ILIKE '%batterie%' THEN 'Batterie'
               WHEN problem_description ILIKE '%charge%' OR problem_description ILIKE '%port%' THEN 'Port charge'
               WHEN problem_description ILIKE '%caméra%' OR problem_description ILIKE '%camera%' THEN 'Caméra'
               WHEN problem_description ILIKE '%haut-parleur%' OR problem_description ILIKE '%speaker%' THEN 'Haut-parleur'
               ELSE 'Autre'
             END AS kind,
             count(*) AS cnt
      FROM public.repairs
      WHERE user_id = _shop_id AND created_at >= _start AND created_at <= _end
      GROUP BY 1
    ) t;

  RETURN jsonb_build_object(
    'totals', v_totals,
    'monthly', v_monthly,
    'top_products', v_top,
    'category_revenue', v_cat,
    'repair_types', v_repair
  );
END;
$$;

-- ==================== 4) Unpaid sales view ====================
-- security_invoker = true ⇒ RLS is evaluated as the CALLING user (no tenant leak).
CREATE OR REPLACE VIEW public.unpaid_sales
WITH (security_invoker = true)
AS
SELECT s.id, s.user_id, s.customer_id, s.total_amount, s.amount_paid,
       (s.total_amount - s.amount_paid) AS remaining_balance,
       s.payment_method, s.created_at
FROM public.sales s
WHERE s.total_amount > 0
  AND (s.total_amount - s.amount_paid) > 0.001;
