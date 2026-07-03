-- Fix: Restrict profiles SELECT to own profile + team relationships
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can search profiles" ON public.profiles;

-- Allow users to see own profile
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

-- Allow team owners to see their team members' profiles
CREATE POLICY "Owners can view team member profiles"
ON public.profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM team_members
    WHERE team_members.owner_id = auth.uid()
      AND team_members.member_user_id = profiles.user_id
      AND team_members.status = 'active'
  )
);

-- Allow team members to see their owner's profile
CREATE POLICY "Members can view owner profile"
ON public.profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM team_members
    WHERE team_members.member_user_id = auth.uid()
      AND team_members.owner_id = profiles.user_id
      AND team_members.status = 'active'
  )
);

-- Allow team members to see other members of the same team
CREATE POLICY "Members can view fellow team member profiles"
ON public.profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM team_members t1
    JOIN team_members t2 ON t1.owner_id = t2.owner_id
    WHERE t1.member_user_id = auth.uid()
      AND t2.member_user_id = profiles.user_id
      AND t1.status = 'active'
      AND t2.status = 'active'
  )
);

-- Platform admins can view all profiles (needed for admin functions)
CREATE POLICY "Platform admins can view all profiles"
ON public.profiles FOR SELECT
USING (
  has_role(auth.uid(), 'platform_admin'::app_role)
);