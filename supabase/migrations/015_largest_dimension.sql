-- Add largest_dimension and dimension_unit to job_queue and jobs
ALTER TABLE job_queue ADD COLUMN IF NOT EXISTS largest_dimension REAL;
ALTER TABLE job_queue ADD COLUMN IF NOT EXISTS dimension_unit TEXT NOT NULL DEFAULT 'mm';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS largest_dimension REAL;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS dimension_unit TEXT NOT NULL DEFAULT 'mm';
