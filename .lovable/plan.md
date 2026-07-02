Plan: harmless test commit to verify GitHub sync

1. Add a temporary comment at the end of README.md with a timestamp, e.g.:
   <!-- sync test: 2026-07-02 — verifying GitHub sync to the new repo -->
2. Save the file change so Lovable attempts to push the commit to the connected GitHub repository.
3. Ask the user to confirm the new commit appears in the new GitHub repo on the correct branch.
4. If the sync is confirmed, remove the temporary comment to leave the repo clean.

No database or frontend changes. No other code files touched.