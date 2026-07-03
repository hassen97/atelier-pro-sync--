
CREATE TABLE public.signup_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_signup_attempts_ip_created ON public.signup_attempts (ip_address, created_at);

-- RLS: no public access, only service role (edge functions) can read/write
ALTER TABLE public.signup_attempts ENABLE ROW LEVEL SECURITY;
