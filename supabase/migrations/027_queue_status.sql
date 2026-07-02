-- Update job_queue status constraint to allow RECEIVED (replaces PENDING)
ALTER TABLE job_queue DROP CONSTRAINT IF EXISTS job_queue_status_check;
ALTER TABLE job_queue ADD CONSTRAINT job_queue_status_check 
  CHECK (status IN ('RECEIVED', 'APPROVED', 'REJECTED'));
ALTER TABLE job_queue ALTER COLUMN status SET DEFAULT 'RECEIVED';
