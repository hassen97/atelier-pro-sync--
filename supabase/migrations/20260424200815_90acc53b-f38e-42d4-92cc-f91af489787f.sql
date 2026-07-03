ALTER TABLE public.verification_requests
  ALTER COLUMN owner_name DROP NOT NULL,
  ALTER COLUMN city DROP NOT NULL,
  ALTER COLUMN address DROP NOT NULL;