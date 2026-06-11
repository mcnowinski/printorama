-- ============================================================
-- Migration 011: Create job_queue table
-- ============================================================

CREATE TABLE IF NOT EXISTS job_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_name TEXT NOT NULL,
  student_email TEXT NOT NULL,
  student_notes TEXT,
  file_url TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_job_queue_email ON job_queue(student_email);
CREATE INDEX idx_job_queue_status ON job_queue(status);

CREATE TRIGGER job_queue_updated_at
  BEFORE UPDATE ON job_queue FOR EACH ROW EXECUTE FUNCTION update_updated_at();
