-- Add job_type field
ALTER TABLE job_queue ADD COLUMN IF NOT EXISTS job_type TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS job_type TEXT;
