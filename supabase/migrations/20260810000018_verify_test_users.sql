-- Verify existing test users by setting their email_confirmed_at timestamp
-- This marks them as verified without needing email confirmation
UPDATE auth.users
SET email_confirmed_at = now(),
    updated_at = now(),
    last_sign_in_at = now()
WHERE email IN (
  'customer+medupiramaboea@gmail.com',
  'provider+medupiramaboea@gmail.com',
  'admin+medupiramaboea@gmail.com'
)
AND email_confirmed_at IS NULL;
