# Fix: employees can't stay logged in (dashboard flashes then disappears)

## Root cause
Every self-signup gets the `super_admin` role from the `handle_new_user` DB trigger.
**15 active employees still carry `super_admin`** alongside their employee/manager role.

Because `useIsOwner()` only checks for `super_admin`, those employees are treated as
shop **owners**:
- `useEffectiveUserId()` returns their *own* id → they load their own empty shop instead
  of the employer's data.
- `useAllowedPages()` returns "all pages" (no restriction).
- The dashboard renders for a moment, then React Query resolves and the view collapses
  into an empty / unauthorized state → "appears for a few seconds and disappears".
- Bonus security hole: the `super_admin` role grants the "Super admins can manage roles"
  RLS policy (privilege escalation).

## Done (DB migration — already applied)
- Removed the stray `super_admin` role from active team members who aren't shop owners.
- Added trigger `sync_team_member_role` on `team_members`: when a member is added/
  re-activated it strips any `super_admin` role and records their team role. Prevents
  recurrence (e.g. adding an existing owner account as an employee).

## Remaining (needs Build mode — code change in `src/hooks/useTeam.ts`)
Make the app resilient so **team membership always wins over a stray owner role**:

1. `useEffectiveUserId()` — return `teamInfo.owner_id` whenever the user is an active
   team member (drop the `&& !isOwner` condition).
2. `useAllowedPages()` — if `teamInfo` exists, return the member's filtered pages
   regardless of `isOwner`; only owners/standalone users get all pages.

These guard against any future role drift even if a `super_admin` row reappears.
