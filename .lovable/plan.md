# Emergency app-email fix via Resend + Hostinger DNS

Lovable's built-in app emails stay blocked while the project has both a Test and Live environment. The workaround: send all app emails through **Resend**, using your Hostinger domain `getheavencoin.com` (verified via DNS records you add in Hostinger). Auth emails (verification, password reset) keep using the existing working path — untouched.

Sender: `RepairPro <Notify@getheavencoin.com>`.

## Part 1 — You: verify the domain in Resend (DNS at Hostinger)

1. Create a free account at resend.com and add the domain `getheavencoin.com`.
2. Resend shows a small set of DNS records (an `MX` for a send subdomain, an `SPF`/TXT record, and a `DKIM` TXT record like `resend._domainkey`, plus an optional DMARC).
3. In Hostinger: **hPanel → Domains → getheavencoin.com → DNS / Nameservers → DNS Zone**, add each record exactly as Resend lists it.
4. Back in Resend, click **Verify** (propagation is usually minutes, up to a few hours).

Notes:
- This does **not** conflict with the existing `notify.getheavencoin.com` delegation used for your auth emails — Resend uses different record names, so both coexist.
- Until the domain shows **Verified** in Resend, sends to your inbox will fail. Verification is the gate.

## Part 2 — Connect Resend to the project

- Link your Resend account through the connector so the backend can send through the Resend gateway (no raw key pasted into code). This exposes a `RESEND_API_KEY` connection value to the edge functions.

## Part 3 — Route app emails through Resend (code)

Change is isolated to the shared queue worker `supabase/functions/process-email-queue/index.ts`:

- For the `transactional_emails` queue, deliver via the Resend connector gateway (`POST https://connector-gateway.lovable.dev/resend/emails`) instead of the blocked Lovable email API. Map the queued payload to Resend fields:
  - `from`: `RepairPro <Notify@getheavencoin.com>`
  - `to`, `subject`, `html`, `text` from the payload
- Keep the `auth_emails` queue on the existing Lovable path (auth emails work and aren't blocked).
- Preserve all existing behavior: suppression check, `email_send_log` rows (`sent` / `failed` / `dlq`), retry budget, TTL, and duplicate guard. Surface the provider's HTTP status + body on failure so errors are debuggable.
- Deploy the function.

Because every app email already flows through the `transactional_emails` queue (signup admin alerts today, plus anything added later), this single change covers **all app emails** with no changes to the callers like `notify-admin-signup`.

## Part 4 — Verify

- Enqueue a test app email and confirm a new `email_send_log` row is `sent` (not `failed`/`dlq`).
- Confirm the message arrives at `hassen.brg97@gmail.com`.
- Trigger/simulate a signup and confirm the admin alert lands in the inbox.

## What I need from you to start building

- Complete Part 1 (domain added in Resend + DNS records in Hostinger) and Part 2 (connect Resend). I can make the code changes in parallel; final verification needs the domain **Verified** in Resend.
