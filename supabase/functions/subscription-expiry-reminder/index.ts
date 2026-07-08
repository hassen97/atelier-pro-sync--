import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

// Daily job: emails shop owners whose subscription expires soon.
// Deduped per (subscription, threshold, expires_at) via subscription_reminder_log.
const THRESHOLDS = [7, 3, 1] // days before expiry

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Allow service-role callers or the cron job (shared secret header).
    const authHeader = req.headers.get('Authorization') ?? ''
    const cronSecret = req.headers.get('x-cron-secret') ?? ''
    const expectedSecret = Deno.env.get('EXPIRY_CRON_SECRET') ?? ''
    const authorized =
      authHeader === `Bearer ${serviceKey}` ||
      (expectedSecret !== '' && cronSecret === expectedSecret)
    if (!authorized) {
      return json({ error: 'Not authorized' }, 401)
    }

    const admin = createClient(supabaseUrl, serviceKey)

    const now = new Date()
    const maxDate = new Date(now.getTime() + (Math.max(...THRESHOLDS) + 1) * 86400000)

    const { data: subs } = await admin
      .from('shop_subscriptions')
      .select('id, user_id, plan_id, status, expires_at')
      .eq('status', 'active')
      .not('expires_at', 'is', null)
      .gte('expires_at', now.toISOString())
      .lte('expires_at', maxDate.toISOString())

    if (!subs || subs.length === 0) return json({ ok: true, sent: 0 })

    // Resolve plan names.
    const planIds = Array.from(new Set(subs.map((s: any) => s.plan_id).filter(Boolean)))
    const { data: plans } = await admin
      .from('subscription_plans')
      .select('id, name')
      .in('id', planIds)
    const planName = new Map((plans ?? []).map((p: any) => [p.id, p.name]))

    // Resolve owner emails + shop names.
    const userIds = Array.from(new Set(subs.map((s: any) => s.user_id)))
    const { data: profiles } = await admin
      .from('profiles')
      .select('user_id, email, full_name')
      .in('user_id', userIds)
    const profileMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p]))
    const { data: shops } = await admin
      .from('shop_settings')
      .select('user_id, shop_name')
      .in('user_id', userIds)
    const shopMap = new Map((shops ?? []).map((s: any) => [s.user_id, s.shop_name]))

    const { data: suppressed } = await admin.from('suppressed_emails').select('email')
    const blocked = new Set((suppressed ?? []).map((s: any) => String(s.email).toLowerCase()))

    let sent = 0
    for (const sub of subs as any[]) {
      const expires = new Date(sub.expires_at)
      const daysLeft = Math.ceil((expires.getTime() - now.getTime()) / 86400000)
      const threshold = THRESHOLDS.find((t) => daysLeft <= t)
      if (threshold === undefined) continue

      // Dedup: skip if already sent for this subscription/threshold/expiry.
      const { data: already } = await admin
        .from('subscription_reminder_log')
        .select('id')
        .eq('subscription_id', sub.id)
        .eq('threshold_days', threshold)
        .eq('expires_at', sub.expires_at)
        .maybeSingle()
      if (already) continue

      const profile = profileMap.get(sub.user_id)
      const email = profile?.email ? String(profile.email).trim() : ''
      if (!email || !email.includes('@') || blocked.has(email.toLowerCase())) continue

      const shopName = shopMap.get(sub.user_id) || profile?.full_name || 'votre boutique'
      const expiresDate = expires.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })

      try {
        const resp = await fetch(`${supabaseUrl}/functions/v1/send-notification-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${serviceKey}`,
            apikey: serviceKey,
          },
          body: JSON.stringify({
            action: 'send',
            template_key: 'subscription_expiry',
            to: email,
            variables: {
              shop_name: shopName,
              plan_name: planName.get(sub.plan_id) || 'votre offre',
              days_left: Math.max(daysLeft, 0),
              expires_date: expiresDate,
              renew_url: 'https://atelier-pro-syncc.lovable.app/checkout',
            },
          }),
        })
        if (resp.ok) {
          await admin.from('subscription_reminder_log').insert({
            subscription_id: sub.id,
            user_id: sub.user_id,
            threshold_days: threshold,
            expires_at: sub.expires_at,
          })
          sent++
        } else {
          console.error('[subscription-expiry-reminder] send failed', resp.status, await resp.text())
        }
      } catch (e) {
        console.error('[subscription-expiry-reminder] error for sub', sub.id, e)
      }
    }

    return json({ ok: true, sent })
  } catch (e) {
    console.error('[subscription-expiry-reminder] error', e)
    return json({ error: e instanceof Error ? e.message : String(e) }, 500)
  }
})
