INSERT INTO public.email_templates (template_key, subject, preheader, heading, intro, body, button_label, footer, accent_color, is_enabled)
VALUES (
  'reset_code',
  'Votre code de vérification RepairPro : {{code}}',
  'Votre code de vérification RepairPro',
  'Votre code de vérification',
  'Vous avez demandé la réinitialisation de votre mot de passe RepairPro. Saisissez le code ci-dessous pour continuer.',
  'Ce code est valable {{expiry_minutes}} minutes et ne peut être utilisé qu''une seule fois. Ne le partagez avec personne.',
  '',
  'Si vous n''avez pas demandé cette réinitialisation, ignorez cet e-mail en toute sécurité.',
  '#2563EB',
  true
)
ON CONFLICT (template_key) DO NOTHING;