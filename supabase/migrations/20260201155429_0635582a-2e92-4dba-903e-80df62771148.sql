-- Enable realtime for repairs table
ALTER PUBLICATION supabase_realtime ADD TABLE public.repairs;

-- Enable realtime for sales table (for sales total updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.sales;

-- Enable realtime for products table (for stock alerts)
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;

-- Enable realtime for customers table (for customer debts)
ALTER PUBLICATION supabase_realtime ADD TABLE public.customers;