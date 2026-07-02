## Plan: Switch GitHub sync from `hassen97/atelier-pro-sync` to `hassen97/atelier-pro-sync-79bb2c07`

### Current state
- Your project is currently synced to GitHub repo: `hassen97/atelier-pro-sync` on branch `main`.
- GitHub is connected through Lovable's native GitHub integration (not an app connector), so the change is done in the Lovable UI.
- The target repo is the old one from the previous workspace: `hassen97/atelier-pro-sync-79bb2c07`.

### Goal
Disconnect the current wrong repo and reconnect the project to the desired old repo `hassen97/atelier-pro-sync-79bb2c07` under the same `hassen97` GitHub account.

### Plan steps

1. **Back up current project state**
   - Before touching the GitHub sync, download the latest codebase or make sure the current published version is saved.
   - This protects the project if the reconnection drops or mis-syncs.

2. **Disconnect the current wrong repo (`atelier-pro-sync`)**
   - In the Lovable editor, open **Project Settings** (project name top-left → Settings).
   - Navigate to the **Git / GitHub** or **Repository connection** section.
   - Click **Disconnect repository** or remove the current `hassen97/atelier-pro-sync` connection.

3. **Reconnect to the target old repo (`atelier-pro-sync-79bb2c07`)**
   - Open the **Plus (+) menu in the chat input → GitHub → Connect project**.
   - Authorize the same `hassen97` GitHub account if prompted.
   - In the repo picker, select the existing repo `hassen97/atelier-pro-sync-79bb2c07`.
   - Choose branch `main` (or whichever branch is the default).

4. **Fallback if Lovable does not allow selecting an existing repo**
   - If the flow only offers **Create Repository**, the chat/agent cannot force it to attach to an existing repo.
   - In that case:
     a. Create a new Lovable-linked repo (e.g. `atelier-pro-sync-new`).
     b. Use the new repo as the Lovable sync target.
     c. Manually merge the new Lovable-pushed code into the canonical old repo `hassen97/atelier-pro-sync-79bb2c07` outside Lovable (GitHub UI or local `git merge`).
     d. Archive or rename the temporary new repo once the old repo is canonical.

5. **Verify sync works**
   - Make a small harmless edit in Lovable (e.g. add a comment to a file).
   - Confirm the commit appears on the target repo in GitHub.
   - Make a small harmless edit in GitHub and confirm it syncs back to Lovable within a minute or two.

### Important notes
- Do not manually change `git remote` URLs inside the project; Lovable manages sync state internally.
- Do not delete or archive the old target repo until the new workspace sync is verified.
- If the old repo contains the pre-workspace code and the current project has newer code, the merge in step 4 may require conflict resolution in GitHub or a local Git client.

### Outcome
After this plan, the project will sync to `hassen97/atelier-pro-sync-79bb2c07` (the old repo) instead of the currently connected `hassen97/atelier-pro-sync`.