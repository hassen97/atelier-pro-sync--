-- Add username column to profiles table
ALTER TABLE public.profiles ADD COLUMN username TEXT UNIQUE;
CREATE INDEX idx_profiles_username ON public.profiles(username);

-- Update the handle_new_user trigger to store username from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    INSERT INTO public.profiles (user_id, full_name, username)
    VALUES (
        NEW.id, 
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        LOWER(NEW.raw_user_meta_data->>'username')
    );
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'employee');
    
    INSERT INTO public.shop_settings (user_id)
    VALUES (NEW.id);
    
    RETURN NEW;
END;
$function$;