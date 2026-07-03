ALTER TABLE public.shop_subscriptions ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;

-- Backfill: explicit trials
UPDATE public.shop_subscriptions
SET trial_ends_at = expires_at
WHERE status = 'trialing' AND trial_ends_at IS NULL;

-- Backfill: short "welcome" trials stored as active (<= 8 days window)
UPDATE public.shop_subscriptions
SET trial_ends_at = expires_at
WHERE status = 'active'
  AND trial_ends_at IS NULL
  AND expires_at IS NOT NULL
  AND started_at IS NOT NULL
  AND (expires_at - started_at) <= interval '8 days';

-- Update handle_new_user so future welcome trials set trial_ends_at
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

  -- 1) Profile (isolated)
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
      COALESCE(NEW.raw_user_meta_data->>'email', NEW.email),
      'verified',
      NULL,
      now()
    )
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user: profile insert failed for %: %', NEW.id, SQLERRM;
  END;

  -- 2) Role (isolated)
  BEGIN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'super_admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user: role insert failed for %: %', NEW.id, SQLERRM;
  END;

  -- 3) Shop settings (isolated)
  BEGIN
    INSERT INTO public.shop_settings (user_id, country, currency)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'country', 'TN'),
      COALESCE(NEW.raw_user_meta_data->>'currency', 'TND')
    );
  EXCEPTION WHEN unique_violation THEN
    NULL;
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user: shop_settings insert failed for %: %', NEW.id, SQLERRM;
  END;

  -- 4) Waitlist gift: 3-day Pro trial (isolated, optional)
  BEGIN
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
            user_id, plan_id, status, started_at, expires_at, trial_ends_at
          )
          VALUES (
            NEW.id, v_pro_plan_id, 'active', now(), now() + interval '3 days', now() + interval '3 days'
          );

          UPDATE public.waitlist
          SET signed_up_user_id = NEW.id,
              trial_granted_at = now()
          WHERE id = v_waitlist_id;
        END IF;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user: waitlist gift failed for %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$function$;