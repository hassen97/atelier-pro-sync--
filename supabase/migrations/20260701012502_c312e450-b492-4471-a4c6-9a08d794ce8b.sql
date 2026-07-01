CREATE OR REPLACE FUNCTION public.sync_team_member_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- A team member must never keep a shop-owner role. This runs for both
  -- active and removed rows so historical team accounts cannot fall back into
  -- owner behavior after being removed.
  DELETE FROM public.user_roles
  WHERE user_id = NEW.member_user_id
    AND role = 'super_admin'
    AND NOT EXISTS (
      SELECT 1
      FROM public.user_roles platform_role
      WHERE platform_role.user_id = NEW.member_user_id
        AND platform_role.role = 'platform_admin'
    );

  IF NEW.status = 'active' THEN
    -- Ensure the current active team role is reflected in user_roles.
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.member_user_id, NEW.role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS sync_team_member_role_trigger ON public.team_members;
DROP TRIGGER IF EXISTS trg_sync_team_member_role ON public.team_members;

CREATE TRIGGER sync_team_member_role_trigger
AFTER INSERT OR UPDATE OF status, role, member_user_id ON public.team_members
FOR EACH ROW
EXECUTE FUNCTION public.sync_team_member_role();