
-- Password reset requests table (anonymous access for unauthenticated users)
CREATE TABLE public.password_reset_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous/unauthenticated) can submit a reset request
CREATE POLICY "Anyone can submit reset request"
  ON public.password_reset_requests
  FOR INSERT
  WITH CHECK (true);

-- Only platform admins can view reset requests
CREATE POLICY "Platform admins can view reset requests"
  ON public.password_reset_requests
  FOR SELECT
  USING (has_role(auth.uid(), 'platform_admin'::app_role));

-- Only platform admins can update reset requests
CREATE POLICY "Platform admins can update reset requests"
  ON public.password_reset_requests
  FOR UPDATE
  USING (has_role(auth.uid(), 'platform_admin'::app_role));

-- Auto-lock new signups: update handle_new_user to set is_locked = true
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    INSERT INTO public.profiles (user_id, full_name, username, is_locked, phone, whatsapp_phone)
    VALUES (
        NEW.id, 
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        LOWER(NEW.raw_user_meta_data->>'username'),
        true,
        NEW.raw_user_meta_data->>'phone',
        NEW.raw_user_meta_data->>'whatsapp_phone'
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
$$;
