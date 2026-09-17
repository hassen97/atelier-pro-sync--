import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import * as jose from 'npm:jose@5.2.0'

// Public endpoint: validates a 6-digit reset code and returns a short-lived JWT.
// The JWT is used to authorize the final password update step.
//
// Security:
//  - Max 5 attempts per code (brute-force protection)
//  - Code must be active (not expired, not already verified)
//  - JWT valid for 5 minutes only
//  - Returns generic errors to prevent timing attacks

const MAX_ATTEMPTS = 5
const JWT_EXPIRY_SECONDS = 300 // 5 minutes

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const error = (msg: string, status = 400) =>
    new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  const success = (token: string) =>
    new Response(JSON.stringify({ token }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const jwtSecret = Deno.env.get('JWT_SECRET') || Deno.env.get('SUPABASE_JWT_SECRET') || serviceKey
    const admin = createClient(supabaseUrl, serviceKey)

    const body = (await req.json().catch(() => ({}))) as {
      identifier?: string
      code?: string
    }

    const searchIdentifier = String(body.identifier || '').trim().toLowerCase()
    const code = String(body.code || '').trim()

    if (!searchIdentifier || !code) {
      return error('Identifiant et code requis')
    }

    if (!/^\d{6}$/.test(code)) {
      return error('Code invalide (6 chiffres requis)')
    }

    // ── Resolve user (username, email or phone) ────────────────────────────
    const digits = (v: string) => v.replace(/[^0-9]/g, '')
    const phoneMatches = (candidate: string, ...known: (string | null | undefined)[]) => {
      const c = digits(candidate)
      if (c.length < 6) return false
      return known.some((k) => {
        const d = digits(String(k ?? ''))
        return d.length >= 6 && (d.endsWith(c) || c.endsWith(d))
      })
    }

    let profile: any = null
    const identifierDigits = digits(searchIdentifier)
    const looksLikePhone =
      !searchIdentifier.includes('@') &&
      identifierDigits.length >= 6 &&
      identifierDigits.length >= searchIdentifier.replace(/[\s+().-]/g, '').length

    if (looksLikePhone) {
      const { data: candidates } = await admin
        .from('profiles')
        .select('user_id,username,phone,whatsapp_phone')
        .or('phone.not.is.null,whatsapp_phone.not.is.null')
        .limit(5000)
      profile =
        (candidates ?? []).find((p: any) => phoneMatches(searchIdentifier, p.phone, p.whatsapp_phone)) ?? null

      if (!profile) {
        const { data: shops } = await admin
          .from('shop_settings')
          .select('user_id,phone,whatsapp_phone')
          .or('phone.not.is.null,whatsapp_phone.not.is.null')
          .limit(5000)
        const shop = (shops ?? []).find((s: any) => phoneMatches(searchIdentifier, s.phone, s.whatsapp_phone))
        if (shop?.user_id) {
          const { data: byShop } = await admin
            .from('profiles')
            .select('user_id,username')
            .eq('user_id', shop.user_id)
            .limit(1)
          profile = byShop?.[0] ?? null
        }
      }
    } else if (searchIdentifier && !searchIdentifier.includes('@')) {
      const { data: profiles } = await admin
        .from('profiles')
        .select('user_id,username')
        .eq('username', searchIdentifier)
        .limit(1)
      profile = profiles?.[0]
    } else {
      const { data: byEmail } = await admin
        .from('profiles')
        .select('user_id,username')
        .ilike('email', searchIdentifier)
        .limit(1)
      if (byEmail?.[0]) {
        profile = byEmail[0]
      } else {
        const { data: byUsername } = await admin
          .from('profiles')
          .select('user_id,username')
          .ilike('username', searchIdentifier)
          .limit(1)
        profile = byUsername?.[0]
      }
    }


    if (!profile?.user_id) {
      return error('Code invalide ou expiré')
    }

    // ── Lookup active code ─────────────────────────────────────────────────
    const { data: resetCodes } = await admin
      .from('password_reset_codes')
      .select('id,code,expires_at,attempts,verified')
      .eq('user_id', profile.user_id)
      .eq('verified', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)

    const resetCode = resetCodes?.[0]

    if (!resetCode) {
      return error('Code invalide ou expiré')
    }

    // ── Check brute-force limit ────────────────────────────────────────────
    if (resetCode.attempts >= MAX_ATTEMPTS) {
      return error('Trop de tentatives. Veuillez demander un nouveau code.')
    }

    // ── Verify code ────────────────────────────────────────────────────────
    if (resetCode.code !== code) {
      // Increment attempts
      await admin
        .from('password_reset_codes')
        .update({ attempts: resetCode.attempts + 1 })
        .eq('id', resetCode.id)

      const remaining = MAX_ATTEMPTS - resetCode.attempts - 1
      if (remaining > 0) {
        return error(`Code incorrect. ${remaining} tentative${remaining > 1 ? 's' : ''} restante${remaining > 1 ? 's' : ''}.`)
      } else {
        return error('Code incorrect. Nombre maximum de tentatives atteint.')
      }
    }

    // ── Mark verified and generate JWT ─────────────────────────────────────
    await admin
      .from('password_reset_codes')
      .update({ verified: true, verified_at: new Date().toISOString() })
      .eq('id', resetCode.id)

    // Generate JWT with HS256
    const secret = new TextEncoder().encode(jwtSecret)
    const token = await new jose.SignJWT({
      sub: profile.user_id,
      type: 'password_reset',
      username: profile.username,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${JWT_EXPIRY_SECONDS}s`)
      .sign(secret)

    return success(token)
  } catch (e) {
    console.error('[verify-reset-code] error', e)
    return error('Une erreur est survenue', 500)
  }
})
