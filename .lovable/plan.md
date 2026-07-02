## Findings

- `GOODS2026` can authenticate successfully, but their account is currently in a broken role state: it has both `super_admin` and `employee` roles.
- Their team membership under GOODS PRO is marked `removed`, so the app treats them like a shop owner after login instead of an active employee.
- This is not isolated: the database currently has 19 mixed owner+employee accounts, including 10 active employees and 9 removed-only employee records.
- The team role trigger now exists, but there are duplicate triggers on `team_members`; this can cause fragile role syncing and should be consolidated.

## Plan

1. **Repair current data safely**
  - Remove stray `super_admin` roles from every account that has a team role (`employee`, `manager`, or `admin`) and is not a platform admin.
  - Keep each employee’s real team role intact.
  - For removed employees like `GOODS2026`, preserve their removed status unless the shop owner reactivates them; the login will then correctly show “employee account removed/not active” instead of entering an empty owner dashboard.
2. **Fix login classification**
  - Update the login role check so active team membership takes priority over `user_roles`.
  - If someone logs in from the Employee tab and has an active team row, allow login even if a stray owner role exists.
  - If someone has only removed team rows, block login with a clear message: the employee account is no longer active and the owner must reactivate it.
  - Prevent removed employees from being treated as owners.
3. **Harden protected routing**
  - Update onboarding/route guards to consider active team membership before owner checks.
  - This prevents employees from flashing the dashboard then disappearing or being redirected into the wrong owner/onboarding/subscription flow.
4. **Consolidate backend role sync**
  - Remove the duplicate team role trigger and keep one canonical trigger.
  - Update `sync_team_member_role()` so:
    - active team members never keep `super_admin`
    - active team members always get their correct role
    - removed team members do not regain owner behavior accidentally
5. **Verify with the test account**
  - Test the `GOODS2026` login flow.
  - Confirm whether the expected result is active access or a clean “account removed” block.
  - Re-check that mixed role accounts are reduced to zero and active employees no longer appear as shop owners.

## Important note

`GOODS2026` is currently marked as a removed employee in the team table. If you want this exact account to login again, I will also reactivate their team membership under GOODS PRO during the fix.

Check all other employees  from other shop owners