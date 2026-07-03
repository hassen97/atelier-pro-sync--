
-- Add verification fields to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'pending_verification',
  ADD COLUMN IF NOT EXISTS verification_deadline timestamp with time zone,
  ADD COLUMN IF NOT EXISTS verification_requested_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS verified_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS verified_by_admin uuid,
  ADD COLUMN IF NOT EXISTS registration_ip text,
  ADD COLUMN IF NOT EXISTS device_user_agent text,
  ADD COLUMN IF NOT EXISTS device_hash text;

-- Create verification_requests table
CREATE TABLE IF NOT EXISTS public.verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  shop_name text NOT NULL,
  owner_name text NOT NULL,
  phone text NOT NULL,
  city text NOT NULL,
  address text NOT NULL,
  google_maps_url text,
  facebook_url text,
  instagram_url text,
  shop_description text,
  message_to_admin text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  reviewed_at timestamp with time zone,
  reviewed_by uuid
);

-- Enable RLS
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;

-- RLS: Users can insert their own requests
CREATE POLICY "Users can submit verification requests"
  ON public.verification_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS: Users can view their own requests
CREATE POLICY "Users can view own verification requests"
  ON public.verification_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS: Platform admins can view all
CREATE POLICY "Platform admins can view all verification requests"
  ON public.verification_requests
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'platform_admin'::app_role));

-- RLS: Platform admins can update
CREATE POLICY "Platform admins can update verification requests"
  ON public.verification_requests
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'platform_admin'::app_role));

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_verification_requests_user_id ON public.verification_requests (user_id);
CREATE INDEX IF NOT EXISTS idx_verification_requests_status ON public.verification_requests (status);
CREATE INDEX IF NOT EXISTS idx_profiles_verification_status ON public.profiles (verification_status);

-- Update handle_new_user to set verification_deadline for new owners
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _auto_confirm boolean := false;
  _setting_value text;
BEGIN
    -- Check auto-confirm setting
    SELECT value INTO _setting_value FROM public.platform_settings WHERE key = 'auto_confirm_signups';
    IF _setting_value = 'true' THEN
      _auto_confirm := true;
    END IF;

    INSERT INTO public.profiles (user_id, full_name, username, is_locked, phone, whatsapp_phone, email, verification_status, verification_deadline)
    VALUES (
        NEW.id, 
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        LOWER(NEW.raw_user_meta_data->>'username'),
        NOT _auto_confirm,
        NEW.raw_user_meta_data->>'phone',
        NEW.raw_user_meta_data->>'whatsapp_phone',
        NEW.raw_user_meta_data->>'email',
        'pending_verification',
        now() + interval '48 hours'
    );
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'super_admin');
    
    INSERT INTO public.shop_settings (user_id, country, currency)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'country', 'TN'),
        COALESCE(NEW.raw_user_meta_data->>'currency', 'TND')
    );
    
    RETURN NEW;
END;
$function$;
