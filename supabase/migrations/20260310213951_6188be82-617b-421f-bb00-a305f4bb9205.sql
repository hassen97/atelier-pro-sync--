
-- Add tracking_token column to repairs table
ALTER TABLE public.repairs ADD COLUMN IF NOT EXISTS tracking_token text;

-- Backfill existing repairs: use their id as token
UPDATE public.repairs SET tracking_token = id::text WHERE tracking_token IS NULL;

-- Make it not null with a default
ALTER TABLE public.repairs ALTER COLUMN tracking_token SET NOT NULL;
ALTER TABLE public.repairs ALTER COLUMN tracking_token SET DEFAULT gen_random_uuid()::text;
CREATE UNIQUE INDEX IF NOT EXISTS repairs_tracking_token_idx ON public.repairs(tracking_token);

-- Create a public SECURITY DEFINER function to fetch repair info by token
CREATE OR REPLACE FUNCTION public.get_repair_by_token(p_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'id', r.id,
    'tracking_token', r.tracking_token,
    'device_model', r.device_model,
    'problem_description', r.problem_description,
    'status', r.status,
    'deposit_date', r.deposit_date,
    'delivery_date', r.delivery_date,
    'customer_name', COALESCE(SPLIT_PART(c.name, ' ', 1), 'Client'),
    'shop_name', ss.shop_name,
    'shop_phone', ss.phone,
    'shop_whatsapp', ss.whatsapp_phone,
    'brand_color', COALESCE(ss.brand_color, 'blue')
  )
  INTO result
  FROM repairs r
  LEFT JOIN customers c ON c.id = r.customer_id
  JOIN shop_settings ss ON ss.user_id = r.user_id
  WHERE r.tracking_token = p_token;
  
  RETURN result;
END;
$$;

-- Grant execute to anonymous and authenticated users
GRANT EXECUTE ON FUNCTION public.get_repair_by_token(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_repair_by_token(text) TO authenticated;
