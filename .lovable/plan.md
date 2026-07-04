## Plan: Fix the OAuth consent “unauthorized request origin” error

The screenshot shows the consent page is reached from `getheavencoin.com`, but the managed OAuth/auth server is rejecting that origin before it can return authorization details.

### What I’ll do

1. **Verify the failing boundary**
   - Check the current OAuth server configuration and discovery metadata.
   - Confirm whether `getheavencoin.com` is missing from the auth/OAuth allowed origins or whether the wrong canonical site URL is configured.

2. **Reconfigure OAuth for the live app**
   - Re-run the managed OAuth server configuration so the consent route `/.lovable/oauth/consent` is active for the current published app origin.
   - Keep dynamic client registration enabled for Claude-compatible MCP clients.

3. **Check the consent redirect behavior**
   - Ensure the app’s consent page still preserves `authorization_id` when users need to sign in.
   - Confirm the consent page calls the existing OAuth helpers and does not expose tokens.

4. **Verify endpoints after configuration**
   - Test the OAuth discovery endpoint.
   - Test the MCP protected-resource metadata.
   - Test the consent page route from the published/custom-domain origin if available.

### Expected result

Opening the Claude/MCP authorization link should no longer show `unauthorized request origin`; it should either show the consent prompt or redirect to sign-in while preserving the consent URL.