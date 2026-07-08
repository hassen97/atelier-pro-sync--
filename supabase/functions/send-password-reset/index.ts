import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

// Public endpoint (no auth): triggered by the "forgot password" form.
// Always returns { ok: true } to avoid username / account enumeration.
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
      redirect_origin?: string
    }
    const username = String(body.username ?? '').trim().toLowerCase()
    if (!username) return ok()

    // Look up the owner's profile by username.
    const { data: profile } = await admin
      .from('profiles')
      .select('user_id, email')
      .eq('username', username)
      .maybeSingle()

    if (!profile?.user_id) return ok()

    // Resolve the real auth email (may differ from the profile email).
    const { data: userRes } = await admin.auth.admin.getUserById(profile.user_id)
    const authEmail = userRes.user?.email
    const targetEmail = (profile.email && String(profile.email).includes('@'))
      ? String(profile.email).trim()
      : authEmail
    if (!authEmail || !targetEmail) return ok()

    // Build recovery link tied to the auth user.
    const origin = String(body.redirect_origin ?? '').replace(/\/$/, '') ||
      'https://atelier-pro-syncc.lovable.app'
    const redirectTo = `${origin}/update-password`

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email: authEmail,
      options: { redirectTo },
    })
    if (linkError || !linkData?.properties?.action_link) {
      console.error('[send-password-reset] generateLink error', linkError)
      return ok()
    }

    // Send the branded, editable password-reset email via the central sender.
    const resp = await fetch(`${supabaseUrl}/functions/v1/send-notification-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
      body: JSON.stringify({
        action: 'send',
        template_key: 'password_reset',
        to: targetEmail,
        variables: {
          reset_url: linkData.properties.action_link,
          expiry_hours: 1,
        },
      }),
    })
    if (!resp.ok) {
      console.error('[send-password-reset] send failed', resp.status, await resp.text())
    }

    return ok()
  } catch (e) {
    console.error('[send-password-reset] error', e)
    return ok()
  }
})
