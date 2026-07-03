ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS logo_size text NOT NULL DEFAULT 'medium';

ALTER TABLE public.shop_settings
  DROP CONSTRAINT IF EXISTS shop_settings_logo_size_check;

ALTER TABLE public.shop_settings
  ADD CONSTRAINT shop_settings_logo_size_check
  CHECK (logo_size IN ('small','medium','large','xlarge'));