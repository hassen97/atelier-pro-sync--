# Login error for rmstechstore + self-service password recovery

## What the investigation found

- The shop "rmstechstore" had **one** failed sign-in at 23:27:16 (Tunis) with "wrong username or password", then **signed in successfully 35 seconds later** at 23:27:51. He is signed in now.
- His account is healthy: not locked, not suspended, verified.
- Four other shops signed in normally in the same period, and his was the only failed attempt. So this is **not** a general problem — it was a mistyped password.
- Real problem worth fixing: **35 of 66 accounts have no real e-mail address on file** (only the internal `username@repairpro.local` placeholder). For those shops the "forgot password" e-mail can never arrive, so recovery today depends on you resetting it by hand.

## What I will do

### 1. Give this owner a fresh password
Set a new password on his account and hand you the value privately in chat, so you can pass it on. He can change it from his settings afterwards.

### 2. Clearer sign-in error
Replace "Nom d'utilisateur ou mot de passe incorrect" with a more helpful message: check that Caps Lock is off and the keyboard language is right, plus a direct "Mot de passe oublié ?" link inside the error box. No change to the sign-in logic itself.

### 3. Rebuild the forgot-password flow so it completes automatically
Keep the secure approach: the e-mail carries a **one-time, one-hour reset link** to a page where the owner types his own new password. I will not e-mail a readable password — an e-mail inbox is not a safe place for one, and anyone reading the message would own the account.

Improvements to the current flow:
- The recovery page will ask for **username and e-mail address**. If we hold no e-mail for that account yet, the owner can supply his own; we save it on his profile only when the username and phone number he enters match what we already have, then send the link there.
- Same neutral confirmation message in every case, so nobody can use the form to discover which usernames exist.
- Rate limiting: at most 3 requests per account and 5 per network address per hour.
- The e-mail keeps your existing branded template on getheavencoin.com; the link lands on the existing "choose a new password" page.
- If no e-mail can be resolved, the request still reaches you as it does today, and the page shows the WhatsApp support button.

### 4. Ask owners for a recovery e-mail
A dismissible one-line prompt in Settings for the 35 accounts with no e-mail, so recovery works for them next time. Nothing is forced.

## Technical notes

- No cause was found in the sign-in code; the auth logs show a single `invalid_credentials` followed by a `200` login for user `e2969d0f`.
- Password change for the owner goes through the existing `admin-manage-users` `reset-password` action (platform-admin guarded).
- `send-password-reset` gains: optional `email` input, profile-email backfill guarded by a username+phone match, per-username and per-IP throttling in a small `password_reset_attempts` table (service-role only, deny-all RLS), and it keeps `admin.auth.admin.generateLink({ type: 'recovery' })` with `redirectTo` `https://www.getheavencoin.com/update-password`. It continues to answer `{ ok: true }` in all cases.
- Frontend touches: `src/pages/Auth.tsx` (error copy), `src/pages/ResetPassword.tsx` (e-mail field, copy), Settings prompt component. `src/pages/UpdatePassword.tsx` unchanged.
- Live and Test both get the migration and function deploy; the change reaches shops after publishing.
