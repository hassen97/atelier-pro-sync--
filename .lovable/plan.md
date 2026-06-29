# Fix: Login fails on www.getheavencoin.com (Vercel)

## What's wrong
Your app has two separate backend databases. Login works on the Lovable site but not on your Vercel custom domain because the Vercel build is connected to the **Test** database (which doesn't have your real shop-owner accounts), while the Lovable site uses the **Live** database.

```text
Lovable site (atelier-pro-sync.lovable.app) ──> LIVE db (uvvpgxjbqrvzhcunkpag)  ✅ accounts exist
Vercel site (www.getheavencoin.com)         ──> TEST db (rgikflkocotkljbajzrb)  ❌ accounts missing
```

This is why you see "wrong credentials" and requests that stay pending.

## The fix (done in Vercel, no code change needed)
Update the environment variables in your Vercel project to use the **Live** backend values, then redeploy.

In **Vercel → your project → Settings → Environment Variables**, set (for Production, and ideally Preview too):

```text
VITE_SUPABASE_URL              = https://uvvpgxjbqrvzhcunkpag.supabase.co
VITE_SUPABASE_PROJECT_ID       = uvvpgxjbqrvzhcunkpag
VITE_SUPABASE_PUBLISHABLE_KEY  = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2dnBneGpicXJ2emhjdW5rcGFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NjM2NDcsImV4cCI6MjA4NTQzOTY0N30.Z3qVgJIsFvQdnxXz5vAnVv4TTSU6ve081TDWGt5QX4g
```

Notes:
- These are **publishable/anon** keys — safe to expose in a frontend build.
- Check the exact variable names your codebase reads (they may also be named `VITE_SUPABASE_ANON_KEY` / `NEXT_PUBLIC_*`). Match whatever the build uses.
- After saving, trigger a **fresh redeploy** in Vercel (env-var changes only apply to new builds, not existing ones). Disable build cache if available.
- Then hard-refresh `www.getheavencoin.com` (the old build may be cached in the browser / service worker).

## Verify
1. Open `www.getheavencoin.com`, DevTools → Network.
2. Log in with an account that works on the Lovable site.
3. The `/auth/v1/token` request should now go to `uvvpgxjbqrvzhcunkpag.supabase.co` and return 200.

## Simpler alternative (optional, recommended)
Instead of maintaining a separate Vercel deployment, you can connect `www.getheavencoin.com` directly to the Lovable-hosted site (Project Settings → Domains). Lovable always wires the Live backend automatically, so this whole env-var mismatch can never happen again — and you'd manage one deployment instead of two. If you want, I can walk you through moving the domain off Vercel onto Lovable.
