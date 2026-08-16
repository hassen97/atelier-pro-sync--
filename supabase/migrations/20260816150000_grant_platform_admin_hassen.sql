-- =====================================================================
-- Grant platform_admin to the "Hassen" account
-- =====================================================================
-- Purpose: dedicated platform-admin account for testing, verification
-- and fixes on the admin dashboard (/admin).
--
-- Idempotent: safe to re-run (UNIQUE (user_id, role) + DO NOTHING).
-- NOTE: if the "hassen" account does not exist yet, this migration is
-- a no-op — sign up with username "hassen" first, then re-apply it.
-- =====================================================================

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'platform_admin'::app_role
FROM auth.users u
WHERE u.email = 'hassen@repairpro.local'
ON CONFLICT (user_id, role) DO NOTHING;
