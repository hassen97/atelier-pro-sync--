ALTER TABLE public.customer_vault
  ADD CONSTRAINT customer_vault_customer_id_fkey
  FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;