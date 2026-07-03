
-- Create platform_settings table for admin configuration
CREATE TABLE public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read (needed for WhatsApp button on public pages)
CREATE POLICY "Anyone can read platform settings"
  ON public.platform_settings FOR SELECT
  USING (true);

-- Only platform_admin can insert/update
CREATE POLICY "Platform admins can manage settings"
  ON public.platform_settings FOR ALL
  USING (public.has_role(auth.uid(), 'platform_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'platform_admin'::app_role));

-- Insert default settings
INSERT INTO public.platform_settings (key, value) VALUES
  ('admin_whatsapp', ''),
  ('auto_confirm_signups', 'false');

-- Add email column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- Update handle_new_user trigger to capture email and check auto-confirm
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

    INSERT INTO public.profiles (user_id, full_name, username, is_locked, phone, whatsapp_phone, email)
    VALUES (
        NEW.id, 
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        LOWER(NEW.raw_user_meta_data->>'username'),
        NOT _auto_confirm,
        NEW.raw_user_meta_data->>'phone',
        NEW.raw_user_meta_data->>'whatsapp_phone',
        NEW.raw_user_meta_data->>'email'
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
