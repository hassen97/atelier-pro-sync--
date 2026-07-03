-- 1. Add tracking columns to waitlist
ALTER TABLE public.waitlist
  ADD COLUMN IF NOT EXISTS notified_at timestamptz,
  ADD COLUMN IF NOT EXISTS signed_up_user_id uuid,
  ADD COLUMN IF NOT EXISTS trial_granted_at timestamptz;

-- 2. Allow platform admins to update waitlist (for tracking)
DROP POLICY IF EXISTS "Platform admins can update waitlist" ON public.waitlist;
CREATE POLICY "Platform admins can update waitlist"
ON public.waitlist
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'platform_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'platform_admin'::app_role));

-- Allow service role to update waitlist from edge functions / triggers
DROP POLICY IF EXISTS "Service role can update waitlist" ON public.waitlist;
CREATE POLICY "Service role can update waitlist"
ON public.waitlist
FOR UPDATE
TO public
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- 3. Update handle_new_user to grant Pro trial if email is on waitlist
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_email text;
  v_pro_plan_id uuid;
  v_waitlist_id uuid;
BEGIN
    v_email := LOWER(COALESCE(NEW.raw_user_meta_data->>'email', NEW.email));

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

    -- Waitlist gift: grant 3-day Pro trial if email is registered on waitlist
    IF v_email IS NOT NULL AND v_email <> '' THEN
      SELECT id INTO v_waitlist_id
      FROM public.waitlist
      WHERE LOWER(email) = v_email
        AND signed_up_user_id IS NULL
      LIMIT 1;

      IF v_waitlist_id IS NOT NULL THEN
        SELECT id INTO v_pro_plan_id
        FROM public.subscription_plans
        WHERE name ILIKE '%Pro%' AND name NOT ILIKE '%Entreprise%'
        ORDER BY price ASC
        LIMIT 1;

        IF v_pro_plan_id IS NOT NULL THEN
          INSERT INTO public.shop_subscriptions (
            user_id, plan_id, status, started_at, expires_at
          )
          VALUES (
            NEW.id,
            v_pro_plan_id,
            'active',
            now(),
            now() + interval '3 days'
          );

          UPDATE public.waitlist
          SET signed_up_user_id = NEW.id,
              trial_granted_at = now()
          WHERE id = v_waitlist_id;
        END IF;
      END IF;
    END IF;

    RETURN NEW;
END;
$function$;