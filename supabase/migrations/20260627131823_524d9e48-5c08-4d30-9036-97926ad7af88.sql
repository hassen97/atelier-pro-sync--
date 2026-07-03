ALTER TABLE public.products
ADD COLUMN subcategory_id uuid REFERENCES public.subcategories(id) ON DELETE SET NULL;

CREATE INDEX idx_products_subcategory_id ON public.products(subcategory_id);