-- Confirm all existing unconfirmed users so they can log in immediately
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email_confirmed_at IS NULL;