import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import {
  renderEmail,
  KNOWN_TEMPLATE_KEYS,
  SAMPLE_VARS,
  type EmailTemplateRow,
  type TemplateVars,
} from '../_shared/notification-templates.ts'

const SENDER_DOMAIN = 'notify.getheavencoin.com'
const FROM = 'RepairPro <Notify@getheavencoin.com>'

type Action = 'preview' | 'test' | 'send' | 'broadcast_changelog'

interface Body {
  action: Action
  template_key?: string
  to?: string
  variables?: TemplateVars
}

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
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const admin = createClient(supabaseUrl, serviceKey)

    const body = (await req.json().catch(() => ({}))) as Body
    const action = body.action

    // --- Authorization -------------------------------------------------------
    const authHeader = req.headers.get('Authorization') ?? ''
    const isServiceCall = authHeader === `Bearer ${serviceKey}`

    // 'send' can be called internally (service role) or by a signed-in caller.
    // preview / test / broadcast require a platform admin.
    let isAdmin = false
    if (!isServiceCall && authHeader) {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      })
      const { data: userData } = await userClient.auth.getUser()
      const uid = userData.user?.id
      if (uid) {
        const { data: hasRole } = await admin.rpc('has_role', {
          _user_id: uid,
          _role: 'platform_admin',
        })
        isAdmin = hasRole === true
      }
    }

    if (action !== 'send' && !isAdmin) {
      return json({ error: 'Platform admin required' }, 403)
    }
    if (action === 'send' && !isServiceCall && !isAdmin) {
      return json({ error: 'Not authorized' }, 403)
    }

    // --- Load template -------------------------------------------------------
    const loadTemplate = async (key: string): Promise<EmailTemplateRow | null> => {
      if (!KNOWN_TEMPLATE_KEYS.includes(key)) return null
      const { data } = await admin
        .from('email_templates')
        .select('*')
        .eq('template_key', key)
        .maybeSingle()
      return (data as EmailTemplateRow) ?? null
    }

    // Enqueue a single transactional email through the Resend-backed queue.
    const enqueue = async (to: string, subject: string, html: string, label: string) => {
      const messageId = crypto.randomUUID()
      const unsubscribeToken = crypto.randomUUID().replace(/-/g, '')
      await admin.from('email_unsubscribe_tokens').insert({ token: unsubscribeToken, email: to }).then(
        () => {},
        () => {},
      )
      const { error } = await admin.rpc('enqueue_email', {
        queue_name: 'transactional_emails',
        payload: {
          to,
          from: FROM,
          sender_domain: SENDER_DOMAIN,
          subject,
          html,
          label,
          purpose: 'transactional',
          message_id: messageId,
          queued_at: new Date().toISOString(),
          idempotency_key: messageId,
          unsubscribe_token: unsubscribeToken,
        },
      })
      if (error) throw new Error(`enqueue failed: ${error.message}`)
    }

    // --- Actions -------------------------------------------------------------
    if (action === 'preview') {
      const tpl = await loadTemplate(body.template_key ?? '')
      if (!tpl) return json({ error: 'Unknown template' }, 400)
      const vars = { ...(SAMPLE_VARS[tpl.template_key] ?? {}), ...(body.variables ?? {}) }
      const { subject, html } = renderEmail(tpl, vars)
      return json({ subject, html })
    }

    if (action === 'test') {
      const tpl = await loadTemplate(body.template_key ?? '')
      if (!tpl) return json({ error: 'Unknown template' }, 400)
      if (!body.to) return json({ error: 'Missing recipient' }, 400)
      const vars = { ...(SAMPLE_VARS[tpl.template_key] ?? {}), ...(body.variables ?? {}) }
      const { subject, html } = renderEmail(tpl, vars)
      await enqueue(body.to, `[TEST] ${subject}`, html, `${tpl.template_key}-test`)
      return json({ ok: true, queued: true, to: body.to })
    }

    if (action === 'send') {
      const tpl = await loadTemplate(body.template_key ?? '')
      if (!tpl) return json({ error: 'Unknown template' }, 400)
      if (!tpl.is_enabled) return json({ ok: true, skipped: 'disabled' })
      if (!body.to) return json({ error: 'Missing recipient' }, 400)
      const { subject, html } = renderEmail(tpl, body.variables ?? {})
      await enqueue(body.to, subject, html, tpl.template_key)
      return json({ ok: true, queued: true })
    }

    if (action === 'broadcast_changelog') {
      const tpl = await loadTemplate('changelog')
      if (!tpl) return json({ error: 'Unknown template' }, 400)
      if (!tpl.is_enabled) return json({ ok: true, skipped: 'disabled', sent: 0 })

      // Recipients: shop owners (super_admin role) with a valid email, not suppressed.
      const { data: owners } = await admin
        .from('user_roles')
        .select('user_id')
        .eq('role', 'super_admin')
      const ownerIds = (owners ?? []).map((o: any) => o.user_id)
      if (ownerIds.length === 0) return json({ ok: true, sent: 0 })

      const { data: profiles } = await admin
        .from('profiles')
        .select('user_id,email')
        .in('user_id', ownerIds)

      const { data: suppressed } = await admin.from('suppressed_emails').select('email')
      const blocked = new Set((suppressed ?? []).map((s: any) => String(s.email).toLowerCase()))

      const emails = Array.from(
        new Set(
          (profiles ?? [])
            .map((p: any) => (p.email ? String(p.email).trim().toLowerCase() : ''))
            .filter((e: string) => e && e.includes('@') && !blocked.has(e)),
        ),
      )

      const vars = (body.variables ?? {}) as TemplateVars
      const { subject, html } = renderEmail(tpl, vars)
      let sent = 0
      for (const email of emails) {
        try {
          await enqueue(email, subject, html, 'changelog')
          sent++
        } catch (e) {
          console.error('[send-notification-email] changelog enqueue failed', email, e)
        }
      }
      return json({ ok: true, sent })
    }

    return json({ error: 'Unknown action' }, 400)
  } catch (e) {
    console.error('[send-notification-email] error', e)
    return json({ error: e instanceof Error ? e.message : String(e) }, 500)
  }
})
