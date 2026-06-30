-- =====================================================================
-- Fix: employees incorrectly carrying the `super_admin` role.
--
-- Every self-signup gets `super_admin` from handle_new_user(). Employees
-- created/added as team members must NOT keep that role, otherwise the app
-- treats them as shop owners (wrong data scope, full page access) and they
-- gain the "Super admins can manage roles" RLS privilege.
-- =====================================================================

-- 1) One-time cleanup: strip super_admin from active team members who are
--    not themselves shop owners (i.e. they don't own any team).
DELETE FROM public.user_roles ur
WHERE ur.role = 'super_admin'
  AND ur.user_id IN (
    SELECT member_user_id FROM public.team_members WHERE status = 'active'
  )
  AND ur.user_id NOT IN (
    SELECT owner_id FROM public.team_members
  );

-- 2) Guard trigger: whenever someone becomes (or is re-activated as) an
--    active team member, remove any stray super_admin role and make sure
--    their team role exists in user_roles. Prevents the "add an existing
--    owner account as an employee" path from leaving super_admin behind.
CREATE OR REPLACE FUNCTION public.sync_team_member_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'active' THEN
    -- A team member is never a shop owner.
    DELETE FROM public.user_roles
    WHERE user_id = NEW.member_user_id
      AND role = 'super_admin';

    -- Ensure the team role is reflected in user_roles.
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.member_user_id, NEW.role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_team_member_role ON public.team_members;
CREATE TRIGGER trg_sync_team_member_role
AFTER INSERT OR UPDATE OF status, role ON public.team_members
FOR EACH ROW
EXECUTE FUNCTION public.sync_team_member_role();
