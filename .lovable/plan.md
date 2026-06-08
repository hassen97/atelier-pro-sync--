# Fix: Test emails never arrive from the Ultra Admin page

## Diagnosis

The email *domain* (`notify.getheavencoin.com`) is verified and healthy. The failure is downstream, in the queue worker `process-email-queue`. Its logs show a consistent rejection on every send:

```text
Email send failed {
  queue: "transactional_emails",
  error: 'Email API error: 403 {"type":"lovable_api_key_not_registered",
          "message":"LOVABLE_API_KEY is not registered for this project"}'
}
```

So the flow works up to the actual send: the email is rendered, enqueued in pgmq, picked up by the worker every 5s — then the email API rejects the `LOVABLE_API_KEY`. The key decrypts but is not in Lovable's active key registry for this project (key drift / stale copy). Result: every queued email fails and eventually lands in the DLQ; nothing is delivered.

This is an infrastructure/credential problem, not a code bug. The admin "test email" UI and the edge functions are wired correctly.

## Fix

1. **Rotate `LOVABLE_API_KEY`** using the dedicated rotate tool (not add/update/delete). This issues a fresh key that is registered in the active registry and writes it back into project secrets.
2. **Redeploy the email edge functions** so they pick up the new secret at runtime: `process-email-queue`, and the auth/app send functions (`auth-email-hook`, `notify-admin-signup`, `notify-waitlist`, etc.) that rely on the key.
3. **Clear / retry the stuck queue**: the previously failed messages already sat for several attempts. After rotation, trigger a fresh test send from the Ultra Admin page (or invoke `process-email-queue`) and confirm a new `sent` row.
4. **Verify** via the `email_send_log` table that the newest send for the test recipient shows `status = sent` rather than `dlq` / `failed`, and confirm the test inbox receives it.

## Notes / scope

- No template or business-logic changes are required — the templates and triggers are fine.
- The unrelated `notify-admin-signup` "duplicate key" warnings on `email_unsubscribe_tokens` are harmless (token already exists) and not the cause of non-delivery; I can optionally make that insert an idempotent upsert as a small cleanup if you want.
- If rotation does not clear the `lovable_api_key_not_registered` error, the next step is to contact Lovable support, as the key registry would need a manual reset.