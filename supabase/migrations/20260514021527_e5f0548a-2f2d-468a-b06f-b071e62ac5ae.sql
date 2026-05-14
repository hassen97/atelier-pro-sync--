ALTER TABLE public.repair_payments ADD COLUMN IF NOT EXISTS payment_type text NOT NULL DEFAULT 'none';
ALTER TABLE public.repair_payments DROP CONSTRAINT IF EXISTS repair_payments_payment_type_check;
ALTER TABLE public.repair_payments ADD CONSTRAINT repair_payments_payment_type_check CHECK (payment_type IN ('full','partial','already_paid','none'));