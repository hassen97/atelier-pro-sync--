-- 1) Recreate the trigger that runs handle_new_user() on every new auth.users insert.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 2) Backfill default shop_settings for any profile that doesn't have one yet.
INSERT INTO public.shop_settings (user_id, shop_name, country, currency, onboarding_completed)
SELECT p.user_id, 'Mon Atelier', 'TN', 'TND', false
FROM public.profiles p
LEFT JOIN public.shop_settings s ON s.user_id = p.user_id
WHERE s.user_id IS NULL;