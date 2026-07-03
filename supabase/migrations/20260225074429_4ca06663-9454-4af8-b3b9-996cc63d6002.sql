
-- 1. Add inventory_locked to shop_settings
ALTER TABLE public.shop_settings ADD COLUMN IF NOT EXISTS inventory_locked boolean NOT NULL DEFAULT false;

-- 2. Create inventory_access_codes table
CREATE TABLE public.inventory_access_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_by uuid NULL,
  used_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory_access_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can manage access codes"
  ON public.inventory_access_codes FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Team members can verify codes"
  ON public.inventory_access_codes FOR SELECT
  USING (is_team_member(user_id, auth.uid()));

-- 3. Create activity_log table
CREATE TABLE public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  actor_id uuid NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NULL,
  details jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view activity log"
  ON public.activity_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Team members can view activity log"
  ON public.activity_log FOR SELECT
  USING (is_team_member(user_id, auth.uid()));

-- 4. Trigger function for products activity logging
CREATE OR REPLACE FUNCTION public.log_product_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activity_log (user_id, actor_id, action, entity_type, entity_id, details)
    VALUES (NEW.user_id, NEW.user_id, 'product_created', 'product', NEW.id,
      jsonb_build_object('name', NEW.name, 'quantity', NEW.quantity, 'sell_price', NEW.sell_price));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.quantity <> NEW.quantity AND OLD.name = NEW.name AND OLD.sell_price = NEW.sell_price AND OLD.cost_price = NEW.cost_price THEN
      INSERT INTO public.activity_log (user_id, actor_id, action, entity_type, entity_id, details)
      VALUES (NEW.user_id, NEW.user_id, 'stock_adjusted', 'product', NEW.id,
        jsonb_build_object('name', NEW.name, 'old_quantity', OLD.quantity, 'new_quantity', NEW.quantity));
    ELSE
      INSERT INTO public.activity_log (user_id, actor_id, action, entity_type, entity_id, details)
      VALUES (NEW.user_id, NEW.user_id, 'product_updated', 'product', NEW.id,
        jsonb_build_object('name', NEW.name, 'old_name', OLD.name, 'old_price', OLD.sell_price, 'new_price', NEW.sell_price));
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.activity_log (user_id, actor_id, action, entity_type, entity_id, details)
    VALUES (OLD.user_id, OLD.user_id, 'product_deleted', 'product', OLD.id,
      jsonb_build_object('name', OLD.name));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_product_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.log_product_activity();

-- 5. Trigger function for sales activity logging
CREATE OR REPLACE FUNCTION public.log_sale_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.activity_log (user_id, actor_id, action, entity_type, entity_id, details)
  VALUES (NEW.user_id, NEW.user_id, 'sale_completed', 'sale', NEW.id,
    jsonb_build_object('total_amount', NEW.total_amount, 'payment_method', NEW.payment_method));
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sale_activity
  AFTER INSERT ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.log_sale_activity();
