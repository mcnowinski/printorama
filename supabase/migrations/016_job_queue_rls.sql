-- Add RLS to job_queue
ALTER TABLE job_queue ENABLE ROW LEVEL SECURITY;

-- Anyone can INSERT (students submitting)
DROP POLICY IF EXISTS "Anyone can insert" ON job_queue;
CREATE POLICY "Anyone can insert"
  ON job_queue FOR INSERT
  WITH CHECK (true);

-- Staff (authenticated) can SELECT all rows
DROP POLICY IF EXISTS "Staff read all" ON job_queue;
CREATE POLICY "Staff read all"
  ON job_queue FOR SELECT
  USING (auth.role() = 'authenticated');

-- Staff (authenticated) can UPDATE (approve/reject)
DROP POLICY IF EXISTS "Staff update" ON job_queue;
CREATE POLICY "Staff update"
  ON job_queue FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Helper function for students to read their own queue items
-- SECURITY DEFINER bypasses RLS on job_queue, but filter-locks to the provided email
CREATE OR REPLACE FUNCTION get_my_queue_items(p_email TEXT)
RETURNS SETOF job_queue
LANGUAGE SQL STABLE SECURITY DEFINER
AS $$
  SELECT * FROM job_queue WHERE student_email = p_email ORDER BY created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION get_my_queue_items TO anon;

-- Revoke anon SELECT on job_queue (now handled by RLS + function)
REVOKE SELECT ON job_queue FROM anon;

NOTIFY pgrst, 'reload schema';
