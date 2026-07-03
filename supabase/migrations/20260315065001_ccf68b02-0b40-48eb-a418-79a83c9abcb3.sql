-- Indexes for product_returns table
CREATE INDEX IF NOT EXISTS idx_product_returns_user_id_created ON public.product_returns (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_returns_status ON public.product_returns (status);

-- Indexes for warranty_tickets table
CREATE INDEX IF NOT EXISTS idx_warranty_tickets_user_id_created ON public.warranty_tickets (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_warranty_tickets_status ON public.warranty_tickets (status);

-- Indexes for defective_parts table
CREATE INDEX IF NOT EXISTS idx_defective_parts_user_id ON public.defective_parts (user_id);
CREATE INDEX IF NOT EXISTS idx_defective_parts_status ON public.defective_parts (status);
