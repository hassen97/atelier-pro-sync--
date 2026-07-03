
-- =============================================
-- 1. Create repair_status_history table
-- =============================================
CREATE TABLE public.repair_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_id uuid NOT NULL REFERENCES public.repairs(id) ON DELETE CASCADE,
  status text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.repair_status_history ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 2. Add new columns to repairs table
-- =============================================
ALTER TABLE public.repairs
  ADD COLUMN IF NOT EXISTS estimated_ready_date date,
  ADD COLUMN IF NOT EXISTS technician_note text,
  ADD COLUMN IF NOT EXISTS intake_photo_url text;

-- =============================================
-- 3. Add new columns to shop_settings table
-- =============================================
ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS google_maps_url text,
  ADD COLUMN IF NOT EXISTS warranty_days integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS show_payment_on_tracking boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS store_hours text;

-- =============================================
-- 4. Create trigger function for status history (on update)
-- =============================================
CREATE OR REPLACE FUNCTION public.log_repair_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.repair_status_history (repair_id, status, note)
    VALUES (NEW.id, NEW.status, NULL);
  END IF;
  IF OLD.technician_note IS DISTINCT FROM NEW.technician_note 
     AND NEW.technician_note IS NOT NULL 
     AND OLD.status = NEW.status THEN
    INSERT INTO public.repair_status_history (repair_id, status, note)
    VALUES (NEW.id, NEW.status, NEW.technician_note);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_repair_status_log ON public.repairs;
CREATE TRIGGER trg_repair_status_log
  AFTER UPDATE ON public.repairs
  FOR EACH ROW
  EXECUTE FUNCTION public.log_repair_status_change();

-- =============================================
-- 5. Log initial creation
-- =============================================
CREATE OR REPLACE FUNCTION public.log_repair_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.repair_status_history (repair_id, status, note)
  VALUES (NEW.id, 'pending', NULL);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_repair_created ON public.repairs;
CREATE TRIGGER trg_repair_created
  AFTER INSERT ON public.repairs
  FOR EACH ROW
  EXECUTE FUNCTION public.log_repair_created();

-- =============================================
-- 6. Update get_repair_by_token RPC
-- =============================================
CREATE OR REPLACE FUNCTION public.get_repair_by_token(p_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'id', r.id,
    'tracking_token', r.tracking_token,
    'device_model', r.device_model,
    'problem_description', r.problem_description,
    'status', r.status,
    'deposit_date', r.deposit_date,
    'delivery_date', r.delivery_date,
    'estimated_ready_date', r.estimated_ready_date,
    'technician_note', r.technician_note,
    'intake_photo_url', r.intake_photo_url,
    'labor_cost', r.labor_cost,
    'parts_cost', r.parts_cost,
    'total_cost', r.total_cost,
    'amount_paid', r.amount_paid,
    'customer_name', COALESCE(SPLIT_PART(c.name, ' ', 1), 'Client'),
    'shop_name', ss.shop_name,
    'shop_phone', ss.phone,
    'shop_whatsapp', ss.whatsapp_phone,
    'brand_color', COALESCE(ss.brand_color, 'blue'),
    'google_maps_url', ss.google_maps_url,
    'warranty_days', COALESCE(ss.warranty_days, 30),
    'show_payment_on_tracking', COALESCE(ss.show_payment_on_tracking, false),
    'store_hours', ss.store_hours,
    'status_history', COALESCE(
      (
        SELECT json_agg(
          json_build_object(
            'id', h.id,
            'status', h.status,
            'note', h.note,
            'created_at', h.created_at
          )
          ORDER BY h.created_at ASC
        )
        FROM public.repair_status_history h
        WHERE h.repair_id = r.id
      ),
      '[]'::json
    )
  )
  INTO result
  FROM public.repairs r
  LEFT JOIN public.customers c ON c.id = r.customer_id
  JOIN public.shop_settings ss ON ss.user_id = r.user_id
  WHERE r.tracking_token = p_token;
  
  RETURN result;
END;
$$;

-- =============================================
-- 7. Storage bucket for intake photos
-- =============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('repair-photos', 'repair-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Repair photos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'repair-photos');

CREATE POLICY "Authenticated users can upload repair photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'repair-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update repair photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'repair-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete repair photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'repair-photos' AND auth.role() = 'authenticated');
