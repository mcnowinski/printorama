-- Track original uploaded filenames
ALTER TABLE job_queue ADD COLUMN IF NOT EXISTS original_filename TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS original_filename TEXT;
