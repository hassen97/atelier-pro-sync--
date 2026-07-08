# Fix: App emails (incl. signup notifications) not sending

## What's broken

Signup alerts are enqueued correctly, but the **shared email queue worker** never delivers them. Over the last 2 days: **0 sent, 335 failed, 67 dead-lettered** — 100% of app emails.

Every failure is the same email-API rejection:

```text
400 missing_parameter
"Missing run_id or idempotency_key"
"App emails can omit run_id by providing idempotency_key with purpose=transactional."
```

The enqueue side already sends `purpose: "transactional"` + `idempotency_key`, and `process-email-queue` reads and forwards them. The problem is the `@lovable.dev/email-js` dependency in `process-email-queue/index.ts` is imported **unpinned** (`npm:@lovable.dev/email-js`), and the resolved version does not actually forward `idempotency_key`/`purpose` to the email API — so the API sees neither `run_id` nor `idempotency_key` and rejects the send. Auth emails use a separate path, which is why only app emails (signup alerts, etc.) are affected.

## Fix

1. **Refresh the managed email infrastructure** so `process-email-queue` is redeployed with a current, compatible worker/library that forwards `idempotency_key` + `purpose` correctly. This is the safe, idempotent managed path and also re-verifies the queue RPCs, cron, and vault key.

2. **If the refresh alone doesn't resolve it**, pin the email library to a known-good version in `supabase/functions/process-email-queue/index.ts` (replace the floating `npm:@lovable.dev/email-js` import with a pinned `npm:@lovable.dev/email-js@<version>`) and redeploy the function, so the deployed code stops drifting to a broken release.

3. **Redeploy** `process-email-queue` (and confirm the cron job that runs it exists while items are queued).

## Verify

- Trigger a test signup alert and watch `email_send_log`: new rows should be `sent`, not `failed`.
- Confirm the target inbox (`hassen.brg97@gmail.com`) receives the notification.
- The 67 dead-lettered messages are stale expired attempts and won't auto-retry; once sending works, new signups will notify normally. No need to replay the old DLQ items (they're duplicate/expired signup events).

## Notes

- No changes to `notify-admin-signup` logic, admin settings, or the DB are required — settings are already correct (`admin_notify_email_enabled=true`, recipient set, browser alerts on).
- This fix restores **all** app emails, not just signup alerts.
