-- Clear all jobs and queued jobs
-- job_history, job_notes, and notifications cascade on job delete

DELETE FROM job_queue;
DELETE FROM jobs;
