-- Inspect auth.users column metadata
SELECT column_name, is_nullable, data_type
FROM information_schema.columns
WHERE table_schema = 'auth' AND table_name = 'users'
ORDER BY ordinal_position;

-- Inspect rows with NULL confirmation_token (includes admin email)
SELECT id, email, confirmation_token
FROM auth.users
WHERE confirmation_token IS NULL OR email = 'dpg@talpa.org'
LIMIT 200;

-- Backup (run in SQL editor and copy results to local file if desired)
SELECT * FROM auth.users;

-- Safe fix: replace NULL confirmation_token values with empty string
-- Run only after you have a backup and accept the change.
BEGIN;
UPDATE auth.users
SET confirmation_token = ''
WHERE confirmation_token IS NULL;
COMMIT;
