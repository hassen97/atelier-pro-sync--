-- 1. Mark all existing profiles as verified
UPDATE public.profiles
SET verification_status = 'verified',
    verification_requested_at = NULL,
    verification_deadline = NULL,
    verified_at = COALESCE(verified_at, now()),
    is_locked = false
WHERE verification_status <> 'verified' OR verification_status IS NULL;

-- 2. Change default for verification_status
ALTER TABLE public.profiles ALTER COLUMN verification_status SET DEFAULT 'verified';

-- 3. Rewrite handle_new_user so new signups are verified out-of-the-box
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO public.profiles (
      user_id, full_name, username, is_locked, phone, whatsapp_phone, email,
      verification_status, verification_deadline, verified_at
    )
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        LOWER(NEW.raw_user_meta_data->>'username'),
        false,
        NEW.raw_user_meta_data->>'phone',
        NEW.raw_user_meta_data->>'whatsapp_phone',
        NEW.raw_user_meta_data->>'email',
        'verified',
        NULL,
        now()
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

-- 4. Drop verification_requests table (no longer used)
DROP TABLE IF EXISTS public.verification_requests CASCADE;

-- 5. New table: admin_signup_events for live admin notifications
CREATE TABLE public.admin_signup_events (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid,
    username text,
    full_name text,
    email text,
    phone text,
    country text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    seen_at timestamp with time zone
);

ALTER TABLE public.admin_signup_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can view signup events"
ON public.admin_signup_events
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Platform admins can update signup events"
ON public.admin_signup_events
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'platform_admin'::app_role));

CREATE POLICY "Service role can insert signup events"
ON public.admin_signup_events
FOR INSERT
TO public
WITH CHECK (auth.role() = 'service_role');

ALTER TABLE public.admin_signup_events REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_signup_events;

-- 6. Seed new platform_settings keys for signup notifications
INSERT INTO public.platform_settings (key, value)
VALUES
  ('admin_notify_email', ''),
  ('admin_notify_email_enabled', 'true'),
  ('admin_notify_browser_enabled', 'true')
ON CONFLICT (key) DO NOTHING;