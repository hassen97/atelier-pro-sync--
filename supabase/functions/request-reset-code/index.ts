import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const MAX_PER_USERNAME_PER_HOUR = 3
const MAX_PER_IP_PER_HOUR = 5
const CODE_EXPIRY_MINUTES = 10

const digits = (v: string) => v.replace(/[^0-9]/g, '')

function phoneMatches(candidate: string, ...known: (string | null | undefined)[]) {
  const c = digits(candidate)
  if (c.length < 6) return false
  return known.some((k) => {
    const d = digits(String(k ?? ''))
    return d.length >= 6 && (d.endsWith(c) || c.endsWith(d))
  })
}

function generateCode(): string {
  const bytes = new Uint8Array(4)
  crypto.getRandomValues(bytes)
  const num = new DataView(bytes.buffer).getUint32(0)
  return String(num % 1000000).padStart(6, '0')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const ok = () =>
    new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(supabaseUrl, serviceKey)

    const body = (await req.json().catch(() => ({}))) as {
      username?: string
      identifier?: string
      email?: string
      phone?: string
    }

    const rawIdentifier = String(body.identifier || body.username || '').trim().toLowerCase()
    const providedEmail = String(body.email ?? '').trim().toLowerCase()
    const providedPhone = String(body.phone ?? '').trim()
    if (!rawIdentifier && !providedEmail) return ok()

    const searchIdentifier = rawIdentifier || providedEmail

    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('cf-connecting-ip') ||
      req.headers.get('x-real-ip') ||
      'unknown'

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

    const [byUser, byIp] = await Promise.all([
      admin.from('password_reset_attempts').select('id', { count: 'exact', head: true }).eq('username', searchIdentifier).gte('created_at', oneHourAgo),
      admin.from('password_reset_attempts').select('id', { count: 'exact', head: true }).eq('ip_address', ip).gte('created_at', oneHourAgo),
    ])

    if ((byUser.count ?? 0) >= MAX_PER_USERNAME_PER_HOUR) return ok()
    if ((byIp.count ?? 0) >= MAX_PER_IP_PER_HOUR) return ok()

    await admin.from('password_reset_attempts').insert({ username: searchIdentifier, ip_address: ip })
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    admin.from('password_reset_attempts').delete().lt('created_at', oneDayAgo).then(() => {})

    const PROFILE_COLS = 'user_id,username,email,phone,whatsapp_phone'
    const identifierDigits = digits(searchIdentifier)
    const looksLikePhone = !searchIdentifier.includes('@') && identifierDigits.length >= 6 &&
      identifierDigits.length >= searchIdentifier.replace(/[\s+().-]/g, '').length

    let profile: any = null

    if (looksLikePhone) {
      // Phone lookup: normalise digits on both sides and match by suffix, so
      // "+216 20 123 456", "0020123456" and "20123456" all resolve.
      const { data: candidates } = await admin
        .from('profiles')
        .select(PROFILE_COLS)
        .or('phone.not.is.null,whatsapp_phone.not.is.null')
        .limit(5000)
      profile = (candidates ?? []).find((p: any) =>
        phoneMatches(searchIdentifier, p.phone, p.whatsapp_phone)
      ) ?? null

      if (!profile) {
        const { data: shops } = await admin
          .from('shop_settings')
          .select('user_id,phone,whatsapp_phone')
          .or('phone.not.is.null,whatsapp_phone.not.is.null')
          .limit(5000)
        const shop = (shops ?? []).find((s: any) =>
          phoneMatches(searchIdentifier, s.phone, s.whatsapp_phone)
        )
        if (shop?.user_id) {
          const { data: byShop } = await admin.from('profiles').select(PROFILE_COLS).eq('user_id', shop.user_id).limit(1)
          profile = byShop?.[0] ?? null
        }
      }
    } else if (rawIdentifier && !rawIdentifier.includes('@')) {
      const { data: profiles } = await admin.from('profiles').select(PROFILE_COLS).eq('username', searchIdentifier).limit(1)
      profile = profiles?.[0]
    } else {
      const { data: byEmail } = await admin.from('profiles').select(PROFILE_COLS).ilike('email', searchIdentifier).limit(1)
      if (byEmail?.[0]) {
        profile = byEmail[0]
      } else {
        const { data: byUsername } = await admin.from('profiles').select(PROFILE_COLS).ilike('username', searchIdentifier).limit(1)
        profile = byUsername?.[0]
      }
    }

    if (!profile?.user_id) return ok()
    const { data: userRes } = await admin.auth.admin.getUserById(profile.user_id)
    if (!userRes.user) return ok()

    const isRealEmail = (v?: string | null) => !!v && v.includes('@') && !v.toLowerCase().endsWith('@repairpro.local')
    let targetEmail = isRealEmail(profile.email) ? String(profile.email).trim() : null

    if (!targetEmail && isRealEmail(providedEmail)) {
      const { data: shop } = await admin.from('shop_settings').select('phone, whatsapp_phone').eq('user_id', profile.user_id).maybeSingle()
      const matched = !!providedPhone && phoneMatches(providedPhone, profile.phone, profile.whatsapp_phone, shop?.phone, shop?.whatsapp_phone)
      if (matched) {
        targetEmail = providedEmail
        await admin.from('profiles').update({ email: providedEmail }).eq('user_id', profile.user_id)
      }
    }

    if (targetEmail && isRealEmail(providedEmail) && providedEmail !== targetEmail.toLowerCase()) return ok()
    if (!targetEmail) return ok()

    const code = generateCode()
    const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000).toISOString()
    await admin.from('password_reset_codes').delete().eq('user_id', profile.user_id).eq('verified', false)
    const { error: insertError } = await admin.from('password_reset_codes').insert({ user_id: profile.user_id, code, expires_at: expiresAt, ip_address: ip })
    if (insertError) {
      console.error('[request-reset-code] insert error', insertError)
      return ok()
    }

    const resp = await fetch(`${supabaseUrl}/functions/v1/send-notification-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceKey}`, apikey: serviceKey },
      body: JSON.stringify({ action: 'send', template_key: 'reset_code', to: targetEmail, variables: { code, expiry_minutes: CODE_EXPIRY_MINUTES, username: profile.username } }),
    })
    if (!resp.ok) console.error('[request-reset-code] email failed', resp.status, await resp.text())

    return ok()
  } catch (e) {
    console.error('[request-reset-code] error', e)
    return ok()
  }
})

