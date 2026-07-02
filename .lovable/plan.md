# Restore Secrets for the Remixed Project

All secret **names** carried into the remix, but secret **values can never be read or exported** (by me or any tool). So this plan re-sets the values you own and regenerates the internal ones. Nothing about the app code changes — only secret values.

## What is already handled automatically (no action)
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`, `SUPABASE_JWKS`, publishable/secret keys — freshly provisioned by Lovable Cloud for the remix.
- `LOVABLE_API_KEY` — auto-provisioned. Only rotate if connector/AI calls fail.

## Step 1 — Re-enter third-party keys you own (secure form)
I'll open the secure form for you to paste values into:
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` — your original web-push pair (you confirmed you have them, so existing push subscriptions keep working).
- `HCAPTCHA_SECRET_KEY` — from your hCaptcha dashboard.
- `VITE_HCAPTCHA_SITE_KEY` — your hCaptcha site key (public, front-end).

## Step 2 — Regenerate internal random secrets (no external source)
These are project-internal random values; I'll generate fresh ones:
- `HEALTH_CRON_SECRET`
- `HEALTH_MONITOR_SECRET`
- `DEMO_RESET_SECRET`
- `DEMO_ACCOUNT_PASSWORD`

Edge functions read these from the environment, so they stay in sync automatically.

## Step 3 — Google Search Console
`GOOGLE_SEARCH_CONSOLE_API_KEY` is connector-managed. If Search Console features error in the remix, I'll reconnect it through Connectors (not the secrets tools).

## Step 4 — Redeploy edge functions
Redeploy affected functions (`send-web-push`, `signup-guard`, health/demo functions) so they pick up the new values, then verify web push and hCaptcha work.

---

### Important notes / risks
- **Regenerating `HEALTH_CRON_SECRET` / `HEALTH_MONITOR_SECRET`**: if a scheduled cron job stores the old value in its request header, that job's auth must be updated to the new value. I'll check the cron config and fix it if needed.
- **`DEMO_ACCOUNT_PASSWORD`**: regenerating changes the demo login password; the demo-login function reads it from env so it stays consistent, but any externally shared demo password would need updating.
- I cannot recover the *original* values of any secret — Step 1 requires you to paste them; Step 2 creates brand-new values.