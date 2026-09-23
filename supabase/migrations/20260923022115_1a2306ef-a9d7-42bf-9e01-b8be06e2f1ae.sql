ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS featured_on_landing boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_shop_settings_featured
  ON public.shop_settings (featured_on_landing)
  WHERE featured_on_landing = true;

CREATE OR REPLACE FUNCTION public.get_featured_shops()
RETURNS TABLE(
  shop_name text,
  address text,
  phone text,
  whatsapp_phone text,
  logo_url text,
  repair_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.shop_name,
    s.address,
    s.phone,
    s.whatsapp_phone,
    s.logo_url,
    (SELECT count(*) FROM public.repairs r WHERE r.user_id = s.user_id)::bigint AS repair_count
  FROM public.shop_settings s
  WHERE s.featured_on_landing = true
    AND s.shop_name IS NOT NULL
    AND btrim(s.shop_name) <> ''
  ORDER BY (SELECT count(*) FROM public.repairs r2 WHERE r2.user_id = s.user_id) DESC
  LIMIT 12;
$$;

REVOKE ALL ON FUNCTION public.get_featured_shops() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_featured_shops() TO anon, authenticated;