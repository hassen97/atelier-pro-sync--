## Problem

The full restore now succeeds for the database (`committed: true`, 189 statements executed), but the storage phase fails for all 21 files with:

```
403 Unauthorized — "Invalid Compact JWS"
```

## Root cause

In `supabase/functions/restore-live-db/index.ts` (Phase B), each file is uploaded with a raw `fetch`:

```
POST {SUPABASE_URL}/storage/v1/object/{bucket}/{path}
Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}
```

This sends only an `Authorization: Bearer` header and no `apikey` header. On this project the backend uses the new API key format (evidenced by the `SUPABASE_SECRET_KEYS` / `SUPABASE_PUBLISHABLE_KEYS` secrets). The new secret key is **not** a JWT, so the Storage API's JWT parser rejects the bearer token with "Invalid Compact JWS". The database phase is unaffected because it uses a direct Postgres connection, not this token.

## Fix

Replace the raw `fetch` upload in Phase B with the `@supabase/supabase-js` storage client, which correctly sends the key in the `apikey` header the current key format expects.

### Changes in `supabase/functions/restore-live-db/index.ts` (Phase B only)

1. Create one admin client for storage:
   ```ts
   const storageClient = createClient(supabaseUrl, serviceKey, {
     auth: { persistSession: false, autoRefreshToken: false },
   });
   ```
2. For each file, keep fetching the source bytes from `f.url`, then upload via the client instead of raw fetch:
   ```ts
   const { error: upErr } = await storageClient.storage
     .from(f.bucket)
     .upload(f.path, bytes, {
       contentType: f.content_type || "application/octet-stream",
       upsert: true,
     });
   ```
3. Record success/failure from `upErr` in the existing `results` array (path, ok, error message) so the response `summary.storage` keeps the same shape (`total` / `succeeded` / `failed`).
4. Keep the existing source-fetch failure handling and try/catch per file.

No other phase, the DB logic, the auth/authorization block, or the response contract changes.

## Verification

- Typecheck the function.
- Re-run a **storage-only** restore (`mode: "storage"`) to confirm files upload with `succeeded: 21, failed: []`, then a full restore to confirm end to end.
