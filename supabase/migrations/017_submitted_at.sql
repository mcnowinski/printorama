-- Store original submission time on jobs
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
