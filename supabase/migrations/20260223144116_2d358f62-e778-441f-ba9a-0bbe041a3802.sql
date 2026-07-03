
-- Add whatsapp_phone column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp_phone text DEFAULT NULL;

-- Platform admins can already view all profiles, and users can update their own.
-- No additional RLS changes needed.
