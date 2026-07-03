-- 1) Recreate the missing trigger that keeps employees from carrying a shop-owner role
DROP TRIGGER IF EXISTS sync_team_member_role_trigger ON public.team_members;
CREATE TRIGGER sync_team_member_role_trigger
AFTER INSERT OR UPDATE ON public.team_members
FOR EACH ROW
EXECUTE FUNCTION public.sync_team_member_role();

-- 2) One-time cleanup: strip stray super_admin from anyone who also holds a team role,
--    excluding protected platform admins.
DELETE FROM public.user_roles ur
WHERE ur.role = 'super_admin'
  AND EXISTS (
    SELECT 1 FROM public.user_roles ur2
    WHERE ur2.user_id = ur.user_id
      AND ur2.role IN ('employee', 'manager', 'admin')
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles pa
    WHERE pa.user_id = ur.user_id
      AND pa.role = 'platform_admin'
  );