
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
        NULL
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
