-- RLS + RPC for job_history (students read via SECURITY DEFINER function)
ALTER TABLE job_history ENABLE ROW LEVEL SECURITY;

-- job_history was created after the initial GRANT ALL, so grant explicitly
GRANT SELECT, INSERT ON job_history TO authenticated;

-- Staff (authenticated) can read all history
DROP POLICY IF EXISTS "Staff read all" ON job_history;
CREATE POLICY "Staff read all"
  ON job_history FOR SELECT
  USING (auth.role() = 'authenticated');

-- Staff can insert history records
DROP POLICY IF EXISTS "Staff insert" ON job_history;
CREATE POLICY "Staff insert"
  ON job_history FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Helper function for students to read history for their own jobs
CREATE OR REPLACE FUNCTION get_my_job_history(p_email TEXT)
RETURNS TABLE (
  id UUID,
  job_id UUID,
  field TEXT,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE SQL STABLE SECURITY DEFINER
AS $$
  SELECT h.id, h.job_id, h.field, h.old_value, h.new_value, h.created_at
  FROM job_history h
  JOIN jobs j ON j.id = h.job_id
  WHERE j.student_email = p_email
  ORDER BY h.created_at ASC;
$$;

GRANT EXECUTE ON FUNCTION get_my_job_history TO anon;
