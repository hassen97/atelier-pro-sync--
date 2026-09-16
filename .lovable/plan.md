# Secure code-based password recovery + enterprise auth redesign

## What I found (verified in the project)

The 6-digit code system is largely built already — but one piece is missing, and that is why recovery emails never arrive:

- The recovery request sends an email using a template named `reset_code`. The email templates table contains only `password_reset`, `signup_admin`, `subscription_expiry`, `changelog`. Unknown template, so the email is rejected and nothing is sent.
- Account lookup currently accepts username or email only. Phone is used to confirm identity, never to find the account.
- The recovery pages use the older gradient/large-icon styling, not the clean enterprise look.

Everything else is already secure and working: codes are stored server-side with a 10-minute expiry, max 5 wrong attempts, 3 requests/hour per account and 5/hour per IP, and verification returns a short-lived 5-minute signed token that the password update step requires.

## What I will do

### 1. Fix email delivery (the actual break)
- Add a `reset_code` template to the email template system, editable in the admin panel like the others (subject, heading, intro, body, footer, accent colour, on/off switch), with the code and expiry inserted automatically.
- All links stay on `www.getheavencoin.com`; the code itself is shown in the email, never a readable password.

### 2. Login or phone number lookup
- The recovery page asks for username, email, **or** phone number.
- Phone lookup is matched server-side against the account's saved phone numbers. The email address is never returned to the browser — the page only ever says "if this account exists, a code was sent".

### 3. Redesigned recovery + sign-in pages
- Clean card, soft shadow, frosted glass, muted secondary text, using the existing theme colours. Old gradient/neon treatment removed.
- Smooth animated transitions between the four steps: sign-in, request code, enter code, choose new password.
- Premium 6-digit split code input with auto-advance, paste support, and auto-submit on the sixth digit (built on the OTP component already in the project).
- 60-second countdown on "Resend code", already present, kept and restyled.

### 4. Single continuous flow
Today the code step and the new-password step live on two different pages. I keep both routes working, but the new-password step now appears in place right after a correct code, so the user never leaves the page.

### 5. Security review
- The new-password step cannot be reached by tampering with the page: the password update runs on the server and is rejected unless it carries the valid signed token issued by a correct code.
- Tokens expire in 5 minutes, are single-use, and all codes for the account are destroyed after a successful change.
- Wrong code, expired code, and unknown account all produce a clear toast message; nothing crashes and no message reveals whether an account exists.

### 6. Verification before I hand it back
- Typecheck and the test suite.
- A real run in the app: request a code for a test account, read the generated code from the database, enter it, set a new password, and sign in with it.

## Technical notes

- New migration: insert the `reset_code` row into `email_templates` (subject, heading, intro, body with `{{code}}` / `{{expiry_minutes}}`, footer, accent). No schema change; `password_reset_codes` and `password_reset_attempts` already exist with the right policies.
- `supabase/functions/request-reset-code/index.ts`: add phone-number lookup (digit-normalised suffix match against `profiles.phone`, `profiles.whatsapp_phone`, `shop_settings.phone/whatsapp_phone`), keep the neutral `{ ok: true }` response, rate limits, and single-active-code behaviour. Redeploy.
- `supabase/functions/_shared/notification-templates.ts`: add `reset_code` sample vars + admin metadata/icon in `AdminEmailTemplatesView.tsx`.
- `src/components/auth/OtpInput.tsx` (new): wrapper over `input-otp` with the enterprise styling, no internal state duplication (avoids render loops).
- `src/pages/ResetPassword.tsx`: rewritten with `framer-motion` `AnimatePresence` step machine (`request` → `code` → `password` → `done`), calling `request-reset-code`, `verify-reset-code`, `update-password-with-token`.
- `src/pages/Auth.tsx`: card/typography restyle of the sign-in panel only; auth logic, role tabs, captcha, and promo/trial banners untouched.
- `src/pages/UpdatePassword.tsx` kept as-is so existing links keep working.
- Verify with `npx tsc -b` and `npx vitest run`, then a Playwright pass against localhost:8080.
- Publishing is needed afterwards for the live app; I will ask before publishing.
