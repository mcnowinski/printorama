-- Helper function for students to read their own jobs
-- Same pattern as get_my_queue_items — SECURITY DEFINER bypasses RLS,
-- filter-locked to the provided email
CREATE OR REPLACE FUNCTION get_my_jobs(p_email TEXT)
RETURNS SETOF jobs
LANGUAGE SQL STABLE SECURITY DEFINER
AS $$
  SELECT * FROM jobs WHERE student_email = p_email ORDER BY created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION get_my_jobs TO anon;
