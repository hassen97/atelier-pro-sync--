import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import * as jose from 'npm:jose@5.2.0'

// Public endpoint: updates password using a verified JWT from verify-reset-code.
// The JWT proves the user successfully verified their reset code.
//
// Security:
//  - JWT signature + expiry validation
//  - Password strength validation (min 6 chars)
//  - Single-use: invalidates the original reset code after use
//  - No Auth session required (passwordless flow)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const error = (msg: string, status = 400) =>
    new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  const success = () =>
    new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const jwtSecret = Deno.env.get('JWT_SECRET') || Deno.env.get('SUPABASE_JWT_SECRET') || serviceKey
    const admin = createClient(supabaseUrl, serviceKey)

    // ── Extract and validate JWT ───────────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return error('Token manquant', 401)
    }

    const token = authHeader.substring(7)
    const secret = new TextEncoder().encode(jwtSecret)

    let payload: any
    try {
      const verified = await jose.jwtVerify(token, secret, {
        algorithms: ['HS256'],
      })
      payload = verified.payload
    } catch (e) {
      console.error('[update-password] JWT verification failed:', e)
      return error('Token invalide ou expiré', 401)
    }

    if (payload.type !== 'password_reset' || !payload.sub) {
      return error('Token invalide', 401)
    }

    const userId = payload.sub as string

    // ── Get new password from body ─────────────────────────────────────────
    const body = (await req.json().catch(() => ({}))) as {
      password?: string
    }

    const password = String(body.password || '').trim()

    if (!password || password.length < 6) {
      return error('Mot de passe invalide (minimum 6 caractères)')
    }

    // ── Update password ────────────────────────────────────────────────────
    const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
      password,
    })

    if (updateError) {
      console.error('[update-password] updateUserById error:', updateError)
      return error('Impossible de mettre à jour le mot de passe', 500)
    }

    // ── Invalidate all reset codes for this user ───────────────────────────
    // Prevents reuse and cleans up verified codes
    await admin
      .from('password_reset_codes')
      .delete()
      .eq('user_id', userId)

    return success()
  } catch (e) {
    console.error('[update-password] error', e)
    return error('Une erreur est survenue', 500)
  }
})
