-- Replace single admin_notes field with a job_notes table
CREATE TABLE job_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_job_notes_job_id ON job_notes(job_id);

-- Copy existing admin_notes into the new table
INSERT INTO job_notes (job_id, content)
  SELECT id, admin_notes FROM jobs WHERE admin_notes IS NOT NULL AND admin_notes != '';

-- Remove the old column
ALTER TABLE jobs DROP COLUMN admin_notes;

-- Permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON job_notes TO authenticated;

ALTER TABLE job_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage notes"
  ON job_notes FOR ALL
  USING (auth.role() = 'authenticated');

-- RPC for students to read notes on their own jobs
CREATE OR REPLACE FUNCTION get_my_job_notes(p_email TEXT)
RETURNS TABLE (id UUID, job_id UUID, content TEXT, created_at TIMESTAMPTZ)
LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SELECT n.id, n.job_id, n.content, n.created_at
  FROM job_notes n JOIN jobs j ON j.id = n.job_id
  WHERE j.student_email = p_email
  ORDER BY n.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION get_my_job_notes TO anon;
