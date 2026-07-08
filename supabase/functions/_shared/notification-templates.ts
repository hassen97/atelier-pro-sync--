// Shared renderer for editable notification emails.
// Each template_key has a fixed, mail-client-safe design. Only the wording
// (subject/heading/intro/body/button_label/footer) is editable via the DB.
// Body background stays #ffffff for deliverability.

export interface EmailTemplateRow {
  template_key: string
  subject: string
  preheader: string
  heading: string
  intro: string
  body: string
  button_label: string
  footer: string
  accent_color: string
  is_enabled: boolean
}

export type TemplateVars = Record<string, string | number | null | undefined>

// Escape values before injecting into HTML.
export const esc = (v: unknown): string =>
  String(v ?? '')
    .slice(0, 2000)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

// Replace {{var}} placeholders in an editable text field (already escaped output).
const interpolate = (text: string, vars: TemplateVars): string => {
  const raw = String(text ?? '').replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
    const val = vars[key]
    return val === undefined || val === null ? '' : String(val)
  })
  return esc(raw).replace(/\n/g, '<br/>')
}

const BRAND = 'RepairPro'

// Shared shell used by every design (keeps deliverability-safe defaults).
function shell(opts: {
  accent: string
  preheader: string
  logoBadge: string
  content: string
  footer: string
}): string {
  return `<!DOCTYPE html>
<html lang="fr" dir="ltr">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background-color:#ffffff;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(opts.preheader)}</div>
<div style="background-color:#f4f6fb;padding:32px 16px;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;">
    <tr><td>
      <div style="background:#ffffff;border:1px solid #e6e9f0;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(15,23,42,0.06);">
        <div style="height:5px;background:${esc(opts.accent)};"></div>
        <div style="padding:32px 28px;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
            <tr>
              <td style="vertical-align:middle;">
                <span style="display:inline-block;width:40px;height:40px;line-height:40px;text-align:center;border-radius:10px;background:${esc(opts.accent)}1a;color:${esc(opts.accent)};font-size:20px;">${opts.logoBadge}</span>
              </td>
              <td style="vertical-align:middle;padding-left:12px;">
                <span style="font-size:18px;font-weight:700;color:#0f172a;">${BRAND}</span>
              </td>
            </tr>
          </table>
          ${opts.content}
        </div>
      </div>
      <p style="text-align:center;color:#94a3b8;font-size:12px;margin:20px 0 0;line-height:1.6;">${esc(opts.footer)}</p>
      <p style="text-align:center;color:#cbd5e1;font-size:11px;margin:8px 0 0;">© ${new Date().getFullYear()} ${BRAND}</p>
    </td></tr>
  </table>
</div>
</body>
</html>`
}

function ctaButton(url: string, label: string, accent: string): string {
  if (!url || !label) return ''
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 8px;">
    <tr><td style="border-radius:10px;background:${esc(accent)};">
      <a href="${esc(url)}" style="display:inline-block;padding:13px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">${esc(label)}</a>
    </td></tr>
  </table>`
}

const h1 = (t: string) => `<h1 style="font-size:22px;font-weight:700;color:#0f172a;margin:0 0 12px;line-height:1.3;">${t}</h1>`
const p = (t: string) => `<p style="font-size:15px;color:#475569;line-height:1.65;margin:0 0 14px;">${t}</p>`

// --- Per-type designs --------------------------------------------------------

function renderSignupAdmin(t: EmailTemplateRow, v: TemplateVars): string {
  const accent = t.accent_color
  const rows = [
    ['Nom complet', v.full_name],
    ['Username', v.username ? `@${v.username}` : ''],
    ['Email', v.email],
    ['Téléphone', v.phone],
    ['Pays', v.country],
  ]
    .map(
      ([label, val]) =>
        `<tr>
          <td style="padding:9px 0;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;">${esc(label)}</td>
          <td style="padding:9px 0;text-align:right;color:#0f172a;font-size:13px;font-weight:600;border-bottom:1px solid #f1f5f9;">${esc(val || '—')}</td>
        </tr>`,
    )
    .join('')
  const content = `
    ${h1(interpolate(t.heading, v))}
    ${p(interpolate(t.intro, v))}
    <div style="background:#f8fafc;border:1px solid #eef2f7;border-radius:12px;padding:8px 16px;margin:18px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
    </div>
    ${t.body ? p(interpolate(t.body, v)) : ''}
    ${v.shop_url ? ctaButton(String(v.shop_url), t.button_label, accent) : ''}`
  return shell({ accent, preheader: interpolate(t.preheader, v), logoBadge: '🔔', content, footer: interpolate(t.footer, v) })
}

function renderPasswordReset(t: EmailTemplateRow, v: TemplateVars): string {
  const accent = t.accent_color
  const content = `
    <div style="text-align:center;margin-bottom:8px;">
      <span style="display:inline-block;width:56px;height:56px;line-height:56px;text-align:center;border-radius:50%;background:${esc(accent)}1a;font-size:26px;">🔒</span>
    </div>
    ${h1(interpolate(t.heading, v))}
    ${p(interpolate(t.intro, v))}
    ${p(interpolate(t.body, v))}
    ${ctaButton(String(v.reset_url ?? ''), t.button_label, accent)}
    <p style="font-size:12px;color:#94a3b8;margin:16px 0 0;word-break:break-all;">${esc(v.reset_url ?? '')}</p>`
  return shell({ accent, preheader: interpolate(t.preheader, v), logoBadge: '🔑', content, footer: interpolate(t.footer, v) })
}

function renderSubscriptionExpiry(t: EmailTemplateRow, v: TemplateVars): string {
  const accent = t.accent_color
  const days = String(v.days_left ?? '')
  const content = `
    ${h1(interpolate(t.heading, v))}
    ${p(interpolate(t.intro, v))}
    <div style="text-align:center;background:${esc(accent)}12;border:1px solid ${esc(accent)}33;border-radius:14px;padding:22px;margin:18px 0;">
      <div style="font-size:40px;font-weight:800;color:${esc(accent)};line-height:1;">${esc(days)}</div>
      <div style="font-size:13px;color:#64748b;margin-top:4px;text-transform:uppercase;letter-spacing:.5px;">jour(s) restant(s)</div>
    </div>
    ${p(interpolate(t.body, v))}
    ${ctaButton(String(v.renew_url ?? ''), t.button_label, accent)}`
  return shell({ accent, preheader: interpolate(t.preheader, v), logoBadge: '⏳', content, footer: interpolate(t.footer, v) })
}

function renderChangelog(t: EmailTemplateRow, v: TemplateVars): string {
  const accent = t.accent_color
  const list = (title: string, items: string, icon: string) => {
    const trimmed = String(items ?? '').trim()
    if (!trimmed) return ''
    const li = trimmed
      .split('\n')
      .map((l) => l.replace(/^[-•*]\s*/, '').trim())
      .filter(Boolean)
      .map(
        (l) =>
          `<tr><td style="padding:6px 0;vertical-align:top;width:24px;font-size:15px;">${icon}</td><td style="padding:6px 0;font-size:14px;color:#334155;line-height:1.5;">${esc(l)}</td></tr>`,
      )
      .join('')
    return `<div style="margin:16px 0;">
      <div style="font-size:13px;font-weight:700;color:#0f172a;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;">${esc(title)}</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${li}</table>
    </div>`
  }
  const content = `
    ${v.version_date ? `<div style="font-size:12px;color:${esc(accent)};font-weight:600;margin-bottom:4px;">${esc(v.version_date)}</div>` : ''}
    ${h1(interpolate(t.heading, v))}
    ${p(interpolate(t.intro, v))}
    ${list('Nouveautés', String(v.features ?? ''), '✨')}
    ${list('Corrections', String(v.fixes ?? ''), '🛠️')}
    ${t.body ? p(interpolate(t.body, v)) : ''}
    ${v.app_url ? ctaButton(String(v.app_url), t.button_label, accent) : ''}`
  return shell({ accent, preheader: interpolate(t.preheader, v), logoBadge: '✨', content, footer: interpolate(t.footer, v) })
}

const RENDERERS: Record<string, (t: EmailTemplateRow, v: TemplateVars) => string> = {
  signup_admin: renderSignupAdmin,
  password_reset: renderPasswordReset,
  subscription_expiry: renderSubscriptionExpiry,
  changelog: renderChangelog,
}

export function renderEmail(template: EmailTemplateRow, vars: TemplateVars = {}): { subject: string; html: string } {
  const renderer = RENDERERS[template.template_key]
  if (!renderer) throw new Error(`Unknown template_key: ${template.template_key}`)
  const subject = String(template.subject ?? '').replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
    const val = vars[key]
    return val === undefined || val === null ? '' : String(val)
  })
  return { subject: subject || BRAND, html: renderer(template, vars) }
}

export const KNOWN_TEMPLATE_KEYS = Object.keys(RENDERERS)

// Sample variables for admin preview / test.
export const SAMPLE_VARS: Record<string, TemplateVars> = {
  signup_admin: {
    full_name: 'Ahmed Ben Ali',
    username: 'atelier_ahmed',
    email: 'ahmed@example.com',
    phone: '+216 20 123 456',
    country: 'TN',
    shop_url: 'https://atelier-pro-syncc.lovable.app/admin',
  },
  password_reset: {
    reset_url: 'https://atelier-pro-syncc.lovable.app/auth#recovery',
    expiry_hours: 1,
  },
  subscription_expiry: {
    shop_name: 'Atelier Ahmed',
    plan_name: 'Pro',
    days_left: 3,
    expires_date: '15 juillet 2026',
    renew_url: 'https://atelier-pro-syncc.lovable.app/checkout',
  },
  changelog: {
    version_date: 'Mise à jour du 8 juillet 2026',
    features: 'Nouveau tableau de bord financier\nModèles d\'e-mails personnalisables',
    fixes: 'Correction de l\'affichage mobile du POS',
    app_url: 'https://atelier-pro-syncc.lovable.app',
  },
}
