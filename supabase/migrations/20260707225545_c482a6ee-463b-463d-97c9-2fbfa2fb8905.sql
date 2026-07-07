-- Promo codes table
CREATE TABLE public.promo_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  discount_type text NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value numeric NOT NULL CHECK (discount_value >= 0),
  max_uses integer,
  used_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.promo_codes TO authenticated;
GRANT ALL ON public.promo_codes TO service_role;

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

-- Only platform admins can read/manage codes directly. Regular users go through the RPC.
CREATE POLICY "Platform admins manage promo codes"
ON public.promo_codes FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'platform_admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'platform_admin'::app_role));

CREATE TRIGGER update_promo_codes_updated_at
BEFORE UPDATE ON public.promo_codes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Promo redemptions table
CREATE TABLE public.promo_redemptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  promo_code_id uuid NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  order_id uuid,
  discount_applied numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (promo_code_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.promo_redemptions TO authenticated;
GRANT ALL ON public.promo_redemptions TO service_role;

ALTER TABLE public.promo_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own redemptions"
ON public.promo_redemptions FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Users insert own redemptions"
ON public.promo_redemptions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Platform admins manage redemptions"
ON public.promo_redemptions FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'platform_admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'platform_admin'::app_role));

-- Remember a promo code entered at signup
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pending_promo_code text;

-- Secure validation function (never exposes the full table)
CREATE OR REPLACE FUNCTION public.validate_promo_code(_code text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_row public.promo_codes%ROWTYPE;
  v_norm text;
BEGIN
  v_norm := UPPER(TRIM(COALESCE(_code, '')));
  IF v_norm = '' THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'empty');
  END IF;

  SELECT * INTO v_row FROM public.promo_codes WHERE code = v_norm;

  IF v_row.id IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'not_found');
  END IF;
  IF NOT v_row.is_active THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'inactive');
  END IF;
  IF v_row.expires_at IS NOT NULL AND v_row.expires_at < now() THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'expired');
  END IF;
  IF v_row.max_uses IS NOT NULL AND v_row.used_count >= v_row.max_uses THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'max_uses_reached');
  END IF;

  -- Already redeemed by this caller?
  IF auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.promo_redemptions
    WHERE promo_code_id = v_row.id AND user_id = auth.uid()
  ) THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'already_used');
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'reason', 'ok',
    'code', v_row.code,
    'promo_code_id', v_row.id,
    'discount_type', v_row.discount_type,
    'discount_value', v_row.discount_value
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_promo_code(text) TO anon, authenticated;

-- Increment usage when an order using a promo is approved
CREATE OR REPLACE FUNCTION public.increment_promo_usage(_promo_code_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'platform_admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE public.promo_codes
  SET used_count = used_count + 1
  WHERE id = _promo_code_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_promo_usage(uuid) TO authenticated, service_role;