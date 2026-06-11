-- ============================================================
-- Migration 009: Queue approach — cleanup + job_queue table
-- ============================================================

-- 1. Revert current_user_role() to original (no SECURITY DEFINER)
--    Recursion won't happen anymore since anon never touches jobs table
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT
LANGUAGE SQL STABLE
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

-- 2. Drop the overly broad GRANTs from migration 007
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon;

-- 3. Grant anon only what public pages need (SELECT) + job_queue (INSERT, SELECT)
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON jobs TO anon;
GRANT SELECT ON printers TO anon;
GRANT SELECT ON dropdown_options TO anon;
GRANT SELECT ON system_settings TO anon;
GRANT INSERT, SELECT ON job_queue TO anon;

-- 4. Authenticated staff get full access
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 5. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
