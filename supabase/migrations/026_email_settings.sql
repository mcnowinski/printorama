-- Email notification settings
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS email_subject_prefix TEXT NOT NULL DEFAULT '[Fab-O-Rama]';
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS site_url TEXT NOT NULL DEFAULT '';
