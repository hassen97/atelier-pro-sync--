-- Default email template for password reset code (6-digit OTP)
INSERT INTO public.email_templates (template_key, subject, preheader, heading, intro, body, footer, accent_color, is_active)
VALUES (
  'reset_code',
  'Réinitialisation de votre mot de passe',
  'Code de vérification pour réinitialiser votre mot de passe',
  'Réinitialisation de mot de passe',
  'Bonjour {{username}},',
  'Vous avez demandé à réinitialiser votre mot de passe. Voici votre code de vérification :

Le code est valide pendant {{expiry_minutes}} minutes.

Si vous n''avez pas fait cette demande, ignorez cet e-mail.',
  'RepairPro — Gestion d''atelier intelligente',
  '#3b82f6',
  true
)
ON CONFLICT (template_key) DO NOTHING;
