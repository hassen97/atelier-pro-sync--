# Password Reset Code System - Deployment Guide

## Overview
Modern 6-digit verification code system replacing Supabase Auth's recovery link flow.

## Files Created

### Database
- `supabase/migrations/20260915033400_password_reset_codes.sql` - Main table + triggers
- `supabase/migrations/20260915033401_email_template_reset_code.sql` - Email template

### Edge Functions
- `supabase/functions/request-reset-code/index.ts` - Generate & send code
- `supabase/functions/verify-reset-code/index.ts` - Validate code, return JWT
- `supabase/functions/update-password-with-token/index.ts` - Update password with JWT

### Frontend
- `src/pages/ResetPassword.tsx` - Complete rewrite (request → verify → redirect)
- `src/pages/UpdatePassword.tsx` - Updated to use JWT from sessionStorage

### Config
- `supabase/config.toml` - Added 3 new function entries
- `supabase/functions/_shared/notification-templates.ts` - Added reset_code renderer

## Deployment Steps

### 1. Database Migrations
```bash
supabase db push
```

### 2. Set JWT Secret (CRITICAL)
```bash
# In Supabase Dashboard → Edge Functions → Secrets
JWT_SECRET=<generate-with-openssl-rand-base64-32>
```

### 3. Deploy Edge Functions
```bash
supabase functions deploy request-reset-code
supabase functions deploy verify-reset-code
supabase functions deploy update-password-with-token
```

### 4. Build & Deploy Frontend
```bash
npm run build
# Deploy to Vercel
```

## Security Features
- 6-digit crypto-random codes (1M combinations)
- 5-attempt brute-force limit (0.0005% success rate)
- 10-minute code expiry
- 5-minute JWT expiry
- Throttling: 3/hour per username, 5/hour per IP
- Anti-enumeration (always returns success)
- Single-use codes (verified flag)

## Testing
1. Navigate to /reset-password
2. Enter username → receive email with 6-digit code
3. Enter code → JWT stored in sessionStorage
4. Redirected to /update-password
5. Set new password → success

## Rollback
Legacy `send-password-reset` function remains intact. Revert frontend changes if needed.

---
**Date:** 2026-09-15 | **Status:** Ready for deployment
