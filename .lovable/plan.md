# Remove the MCP integration

You want the entire MCP (external-agent connector) feature gone because it's an unwanted security surface. Everything below is self-contained to MCP — the subscription-bonus work and all other app features are untouched.

## What gets removed

1. **Vite plugin** (`vite.config.ts`)
   - Remove the `import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/supabase/vite";` line.
   - Remove `mcpPlugin(),` from the `plugins` array. (The `.filter(Boolean)` and every other plugin stay.)

2. **MCP source** — delete the whole folder:
   - `src/lib/mcp/index.ts`
   - `src/lib/mcp/tools/` (get-shop-overview, list-repairs, search-inventory, search-customers)

3. **Generated edge function**
   - Delete `supabase/functions/mcp/index.ts`.
   - Delete the deployed `mcp` function from the backend so the live endpoint stops serving.

4. **OAuth consent page** (only existed for MCP)
   - Delete `src/pages/OAuthConsent.tsx`.
   - In `src/App.tsx`, remove the `OAuthConsent` lazy import (line 83) and its `/.lovable/oauth/consent` route (lines 126–127).

5. **Manifest**
   - Remove `.lovable/mcp/manifest.json`.

6. **Dependency**
   - Remove `@lovable.dev/mcp-js` from `package.json`.

7. **OAuth server (security hardening)**
   - The managed OAuth server / dynamic client registration was enabled for MCP. I'll disable dynamic client registration so no external client can self-register anymore. Note: the managed OAuth authorization endpoints are a platform-level toggle; with the consent route and edge function removed there is no app surface for them, and I'll lock down registration to close the risk.

## What stays (untouched)

- Subscription bonus / month-adjustment feature (`useSubscription.ts`, `GodModeSubscriptionDialog.tsx`, `notify-subscription-bonus` function, `subscription-bonus.tsx` email template).
- All other pages, routes, auth, and normal app login.

## Verification

- Typecheck + build to confirm no dangling imports (App.tsx, vite.config.ts).
- Confirm the `mcp` edge function is deleted from the backend.
- Confirm `/.lovable/oauth/consent` returns 404 (route removed).

## Note on alternative

If you'd rather wipe the MCP work by rewinding history instead of surgically removing it, you could use the History tab / revert — but because MCP was added interleaved with the subscription-bonus feature and OAuth fixes, a revert would also undo that work. The surgical removal above keeps the subscription feature.
