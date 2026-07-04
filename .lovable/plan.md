# Fix: Claude can't register with the MCP server

## What's actually happening

Claude connects to the **production** MCP URL you pasted:
`https://uvvpgxjbqrvzhcunkpag.supabase.co/functions/v1/mcp`

That's a different backend than the **dev** one where the MCP feature was built
(`rgikflkocotkljbajzrb`). I verified both:

```text
                         dev (rgikflk…)     prod (uvvpgxj…)  ← Claude uses this
MCP function             200 / 401 OK       404 NOT_FOUND
OAuth discovery          200 OK             404 "OAuth server is disabled"
Client registration      201 Created        404 "OAuth server is disabled"
Consent page             published          n/a (function missing)
```

Claude's flow is: discover → **register a client** → consent → get token. On
production the register step hits an auth server that is turned off, so Claude
reports *"Couldn't register with the sign-in service."* The code is correct; the
stack simply isn't live on production yet.

## Plan

1. **Publish the app** so the `mcp` edge function and the `/.lovable/oauth/consent`
   route are deployed to the production backend. This is the core missing step —
   the MCP work has never been pushed live.

2. **Enable the OAuth server on production.** After publish, re-run the OAuth
   server configuration so production's auth service exposes the authorize/token/
   registration endpoints (currently `feature_disabled`). Confirm the production
   consent Site URL stays `https://atelier-pro-syncc.lovable.app/.lovable/oauth/consent`.

3. **Verify the production endpoints** the same way I verified dev:
   - `POST .../functions/v1/mcp` (no auth) → `401` with a
     `WWW-Authenticate: Bearer … resource_metadata=…` header
   - `.../functions/v1/mcp/.well-known/oauth-protected-resource` → `200`, pointing
     at `https://uvvpgxjbqrvzhcunkpag.supabase.co/auth/v1`
   - `.../auth/v1/.well-known/oauth-authorization-server` → `200`
   - `POST .../auth/v1/oauth/clients/register` → `201`

4. **Create a dedicated fallback OAuth Client ID for Claude** (once step 2 makes
   the endpoint live) with redirect URI `https://claude.ai/api/mcp/auth_callback`,
   and give you the `client_id` to paste into Claude's *"add an OAuth Client ID"*
   field — a manual bypass in case auto-registration still hiccups.

5. **Re-add the connector in Claude** using the same production URL. Since your
   earlier attempt cached a failed state (the error still showed the old
   "RepairPro" name), remove the existing connector entirely and add it fresh.

## Notes / caveats

- The issuer in `src/lib/mcp/index.ts` is built from `VITE_SUPABASE_PROJECT_ID`,
  which is the production ref at publish time, so the deployed production function
  will advertise the correct production issuer automatically — no code change needed.
- No source files need editing for this fix; it is a deploy + backend-config +
  verification task. If verification in step 3 reveals the production issuer or
  consent URL is wrong, I'll flag it rather than silently patch.
- I will explicitly report anything I cannot complete — e.g. if publishing the
  edge function to production or enabling the production OAuth server is not
  something I can trigger from here and needs a Publish click from you.
