ALTER TABLE public.shop_settings
ADD COLUMN IF NOT EXISTS show_receipt_note boolean NOT NULL DEFAULT true;