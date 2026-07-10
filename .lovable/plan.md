# Point all email links to getheavencoin.com

All email **sender** addresses already use `getheavencoin.com` (you chose to keep `Notify@getheavencoin.com`). The remaining issue is that several emails contain **links** (reset password, admin, checkout, app home) that still point to `atelier-pro-syncc.lovable.app`. This plan changes every in-email link to your real domain, matching what the auth emails already use (`https://www.getheavencoin.com`).

## What changes

Replace the hardcoded `lovable.app` links with `https://www.getheavencoin.com` in the email-generating functions:

1. **Admin signup notification** — "view shop" button link → `https://www.getheavencoin.com/admin`
2. **Subscription expiry reminder** — renew button link → `https://www.getheavencoin.com/checkout`
3. **Password reset email** — the recovery link's base URL → `https://www.getheavencoin.com/update-password` (currently falls back to lovable.app)
4. **Verification reminder** — base URL → `https://www.getheavencoin.com`
5. **Onboarding reminder** — base URL → `https://www.getheavencoin.com`
6. **Shared notification template previews** — the sample link values used in the admin live-preview → getheavencoin.com equivalents (so the preview also shows the correct domain)

The editable template **content** you manage in the admin panel is untouched — only the underlying link targets change.

## Auth redirect allow-list

For the password-reset link to work when it points at `www.getheavencoin.com/update-password`, that URL must be in the auth redirect allow-list. I'll add `https://www.getheavencoin.com/**` to the allowed redirect URLs so the recovery link is accepted.

## Deploy & remember

- Redeploy the affected email edge functions after the edits so the new links go live.
- Save to project memory that this project's canonical domain is **getheavencoin.com** (app links use `https://www.getheavencoin.com`, emails send from `Notify@getheavencoin.com`, sender domain `notify.getheavencoin.com`) for all future work.

## Technical notes

Files touched (edge functions only — no app UI logic changes):
- `supabase/functions/notify-admin-signup/index.ts`
- `supabase/functions/subscription-expiry-reminder/index.ts`
- `supabase/functions/send-password-reset/index.ts`
- `supabase/functions/send-verification-reminder/index.ts`
- `supabase/functions/send-onboarding-reminder/index.ts`
- `supabase/functions/_shared/notification-templates.ts`

Auth config: add `https://www.getheavencoin.com/**` to redirect allow-list. Then deploy the six functions.