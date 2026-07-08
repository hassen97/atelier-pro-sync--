# Editable Email Templates in the Admin Panel

## Goal
Add a new **"Modèles d'e-mails"** section in the admin dashboard where you can edit the text of each notification email (subject, heading, body, button label, footer) on top of a fixed, polished, unique design per type. Then wire up automatic sending for the new types. All emails keep routing through your verified Resend domain (`Notify@getheavencoin.com`).

## The 4 email types & their unique designs
1. **Signup notification (admin alert)** — sent to you when a new shop registers. Design: dark data-card with a details table (name, username, email, phone, country), blue accent, "Voir la boutique" button. Refactors the existing hardcoded email.
2. **Forgot / reset password (to user)** — *new*. Design: security theme, lock icon, amber+blue accent, large "Réinitialiser mon mot de passe" button, expiry note.
3. **Subscription expiry reminder (to user)** — *new*. Design: urgency theme, orange accent, days-remaining highlight, plan name, "Renouveler mon abonnement" button.
4. **Update log / changelog notification** — *new*. Design: feature-announcement theme, "Nouveautés" header, version/date, formatted feature list, blue accent, "Découvrir" button.

Each design is locked so emails always render correctly across mail clients; only the wording is editable.

## What you'll be able to do in the admin panel
- Open **Modèles d'e-mails** in the sidebar → see all 4 templates as cards.
- Edit each template's fields (subject, preheader, heading, intro, body, button label, footer) with a **live preview** of the real design.
- Toggle each email type on/off.
- Send a **test email** of any type to yourself.

## Automatic sending
- **Signup alert**: unchanged trigger (on new signup), now rendered from the editable template.
- **Forgot password**: the public reset page will trigger a secure reset-link email to the owner automatically.
- **Subscription expiry**: a daily background job scans subscriptions and emails owners whose plan expires soon (e.g. 7/3/1 days out), once per threshold.
- **Changelog**: when you publish a changelog/announcement, an "also email shops" option sends it to active shops (respecting the unsubscribe/suppression list).

---

## Technical details

### Database (migration)
New table `public.email_templates`:
- `id uuid pk`, `template_key text unique` (`signup_admin`, `password_reset`, `subscription_expiry`, `changelog`)
- Editable content: `subject`, `preheader`, `heading`, `intro`, `body`, `button_label`, `footer`, `accent_color`
- `is_enabled boolean default true`, `updated_at`, `updated_by uuid`
- GRANTs: `SELECT, UPDATE ON public.email_templates TO authenticated; ALL TO service_role;`
- RLS: SELECT + UPDATE only for `has_role(auth.uid(),'platform_admin')`. Edge functions read via service role.
- Seed the 4 rows with current default copy.

Track sent expiry reminders to avoid duplicates: add `last_expiry_reminder_sent_at`/threshold column to `shop_subscriptions` (or a small `subscription_reminder_log` table keyed by subscription + threshold).

### Shared renderer (Deno)
`supabase/functions/_shared/notification-templates.ts`: one render function per `template_key` producing final HTML from the template row + runtime variables (uses inline styles, `#ffffff` body background, escapes all interpolated values). Distinct layout constants per type.

### Edge functions
- **`send-notification-email`** (new, central): input `{ template_key, to, variables, test?, preview? }`. Loads the row, checks `is_enabled`, renders HTML, and enqueues to `transactional_emails` (or returns HTML when `preview:true`). Reused by all triggers and the admin editor's test/preview. JWT/role validated in code.
- **`notify-admin-signup`** (refactor): render the `signup_admin` template via the shared renderer instead of inline HTML.
- **`subscription-expiry-reminder`** (new): scans `shop_subscriptions` for `expires_at` within thresholds, resolves owner email from `profiles`, calls the renderer, dedupes by threshold. Scheduled via `pg_cron` daily (inserted with project URL + anon key using the insert tool, not a migration).
- **Forgot password**: the public `/reset-password` submit calls an edge function that generates a recovery link (`admin.auth.admin.generateLink`, type `recovery`, using the profile email) and sends the `password_reset` template.
- **Changelog**: extend the announcement publish path (`QuickChangelogDialog`/announcements) with an optional "email shops" action that iterates active shops and enqueues the `changelog` template, checking `suppressed_emails`.

All changed functions deployed after edits.

### Frontend
- New `src/components/admin/AdminEmailTemplatesView.tsx`: cards per type, edit form (shadcn inputs/textarea), enable toggle, live preview (via `send-notification-email` `preview:true`), and "Envoyer un test" button.
- Add sidebar entry `email_templates` → "Modèles d'e-mails" (Mail icon) in `AdminSidebar.tsx` under **Système**, and wire the view in `AdminDashboard.tsx` + `AdminView` type.
- Add a `useEmailTemplates` hook (React Query) for load/update.
- Add the "email this changelog" checkbox to the changelog dialog.

### Notes
- Styling follows the app's Premium Dark SaaS palette but email bodies stay light for deliverability.
- Editable = wording/toggle only; the per-type visual design is fixed in code so rendering stays reliable.
