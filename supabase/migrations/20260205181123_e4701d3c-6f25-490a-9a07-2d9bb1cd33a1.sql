-- Add tax_enabled column to shop_settings
ALTER TABLE shop_settings 
ADD COLUMN tax_enabled boolean NOT NULL DEFAULT true;