# Fix the white Live app and the broken email sending

## What I verified

**1. The published (Live) app is completely broken — not just `/db-restore`.**
Loading `https://atelier-pro-syncc.lovable.app/` and `/db-restore` in a headless browser gives an empty page and one fatal error:

```text
Cannot read properties of undefined (reading 'forwardRef')
```

The HTML and the JS bundle both return 200, so this is not a hosting or cache problem — the production bundle itself crashes before React mounts. The local dev preview renders fine on the same code, which is why this only shows after publishing.

Cause: the manual chunk splitting in `vite.config.ts` puts `react`/`react-dom`/`scheduler` in a separate `vendor-react` chunk while many other vendor chunks (radix, router, motion, icons, forms, ui) import React. With that split, a vendor chunk can execute before `vendor-react` has initialised, so `React` is `undefined` and the first `forwardRef` call kills the app.

**2. Emails are enqueued but never sent — the Resend key is missing.**
The project's secrets list has no `RESEND_API_KEY`, and the send log confirms it:

```text
failed  "RESEND_API_KEY not configured"   (most recent 2026-08-11)
dlq     "Max retries (5) exceeded"        178 rows
```

The Resend connection ("123") exists in this workspace but is **not linked to this project**, so `process-email-queue` has no gateway key. The app reports "email sent" because enqueueing succeeds; the queue worker then fails on every send. 901 failed + 195 dead-lettered rows.

## Plan

1. **Fix the production bundle crash** — rework `manualChunks` in `vite.config.ts` so React and every React-dependent vendor library live in one chunk (keep only the genuinely independent heavy split, `vendor-three`). This removes the load-order hazard entirely rather than reordering it.

2. **Verify the built output before publishing** — run a production build, serve `dist` locally, and load `/` and `/db-restore` in a headless browser to confirm zero page errors and real rendered content. This is the check that was missing last time: dev mode never exercises the chunk split.

3. **Publish** so the Live app (and the `/db-restore` bridge on Live) actually loads.

4. **Relink Resend** — link the workspace Resend connection to this project so `RESEND_API_KEY` is injected, then redeploy `process-email-queue` and send one test email end-to-end to your inbox to confirm delivery.

5. **Clear the failed backlog** — leave the historical `failed`/`dlq` rows in place as a record, but confirm the queue drains cleanly for new sends (dead-lettered emails are not retried automatically, so nothing old will suddenly flood your inbox).

6. **Then finish the restore** — once Live loads, `/db-restore` on the published app works and you can run the import step with the payload URL from the preview export.

## Technical notes

- `vite.config.ts`: single `vendor` chunk for React and React-consuming libs; `vendor-three` kept separate (lazy, no React re-entry at init). No app-code or SW changes.
- No database, RLS, or edge-function logic changes; `process-email-queue` only needs a redeploy to pick up the linked secret.
- The restore bridge (`restore-live-db`, `/db-restore`, `RESTORE_SECRET`) stays in place until you confirm the import, then I remove it and republish.
