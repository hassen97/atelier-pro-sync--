# Reset GitHub Integration to Match Current Project

## Goal
Force the GitHub repository to exactly match the current Lovable project state and start with a clean commit history.

## Approach
Because the sandbox only has credentials for Lovable's internal git mirror and not for the user's GitHub account, the safest and most reliable reset is to break the existing GitHub connection, recreate the GitHub repository, and reconnect it. This gives the equivalent of a force-push with clean history without needing GitHub credentials in the sandbox.

## Steps

1. **Snapshot the current project state**
   - Confirm the latest code is in Lovable and ready to push.

2. **Disconnect GitHub in Lovable**
   - Open the project in Lovable.
   - Go to the Plus menu in the chat input → GitHub → Disconnect project.
   - Wait for the disconnection to complete.

3. **Reset the GitHub repository**
   - Go to the GitHub repository settings.
   - Choose one of the following:
     - **Delete the repository** (clean history, same URL can be reused later).
     - **Rename it to archive** (keeps old history under a new name) and create a new empty repo with the original name.
   - Ensure the target repository is empty before reconnecting.

4. **Reconnect GitHub in Lovable**
   - In Lovable: Plus menu → GitHub → Connect project.
   - Authorize the Lovable GitHub App again if needed.
   - Select the target account and the empty repository.
   - Make sure the GitHub App has "Repository access" set to "All repositories".

5. **Trigger Lovable sync**
   - Lovable will push the current project state to the empty repository as the initial commit.
   - If it does not sync immediately, make a tiny non-destructive edit (for example, add a blank line to README.md) and save it to force a push.

6. **Verify the reset**
   - Check that the GitHub repository contains the same files as the current Lovable project.
   - Confirm the commit history shows only the new initial commit.

## Technical Notes

- This gives a clean history because the repository is created from scratch.
- If you want to preserve the old history for reference, rename the old repo instead of deleting it.
- Lovable's two-way sync will resume from the fresh repository state; no further manual pushes are needed.
- This does not change the Lovable project itself or its data, only the GitHub repository.