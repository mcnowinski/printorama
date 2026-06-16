-- Add title column back to job_queue and jobs
ALTER TABLE job_queue ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT '';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT '';
