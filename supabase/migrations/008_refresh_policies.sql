-- Recreate the jobs INSERT policy and refresh PostgREST schema cache
DROP POLICY IF EXISTS "Anyone can submit a job" ON jobs;
CREATE POLICY "Anyone can submit a job"
  ON jobs FOR INSERT
  WITH CHECK (true);

-- Reload PostgREST schema cache so it picks up the changes
NOTIFY pgrst, 'reload schema';
