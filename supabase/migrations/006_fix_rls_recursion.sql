-- Fix infinite RLS recursion in current_user_role()
-- SECURITY DEFINER bypasses RLS on the users table when reading the role
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT
LANGUAGE SQL STABLE SECURITY DEFINER
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;
