
-- Add barcodes array column to products table
ALTER TABLE public.products 
  ADD COLUMN IF NOT EXISTS barcodes text[] NOT NULL DEFAULT '{}';

-- Migrate existing SKU data to barcodes array
UPDATE public.products 
  SET barcodes = ARRAY[sku] 
  WHERE sku IS NOT NULL AND sku <> '' AND array_length(barcodes, 1) IS NULL;

-- Create GIN index for fast barcode array searches
CREATE INDEX IF NOT EXISTS idx_products_barcodes ON public.products USING GIN(barcodes);
