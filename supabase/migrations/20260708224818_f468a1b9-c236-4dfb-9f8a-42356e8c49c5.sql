SELECT public.enqueue_email('transactional_emails', jsonb_build_object(
  'to','hassen.brg97@gmail.com',
  'from','RepairPro <noreply@getheavencoin.com>',
  'sender_domain','notify.getheavencoin.com',
  'subject','Test alerte inscription (diagnostic)',
  'html','<p>Test de verification du systeme d e-mails RepairPro.</p>',
  'text','Test de verification du systeme d e-mails RepairPro.',
  'label','diagnostic-test',
  'purpose','transactional',
  'message_id', gen_random_uuid()::text,
  'queued_at', now(),
  'idempotency_key', gen_random_uuid()::text
));