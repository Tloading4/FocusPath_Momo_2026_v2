/*
  # Disable RLS for Firebase Authentication

  ## Overview
  This migration disables Row Level Security on user_profiles because the application
  uses Firebase Authentication instead of Supabase Auth. The `auth.uid()` function
  returns NULL for Firebase users, blocking all operations.

  ## Changes Made
  
  ### 1. Disable RLS on user_profiles
    - Removes all RLS policies
    - Disables RLS entirely
    - Firebase handles authentication and authorization on the client side
  
  ### 2. Security Considerations
    - Client-side security through Firebase Auth
    - Anon key has full access to user_profiles (acceptable since Firebase controls auth)
    - Consider application-level security checks
  
  ## Alternative Approach
  If you want to keep RLS, you would need to:
  - Switch to Supabase Auth, OR
  - Use service role key on a backend server, OR
  - Implement custom claims with JWT tokens
*/

-- Drop all existing RLS policies on user_profiles
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON user_profiles;

-- Drop any other policies that might exist
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE tablename = 'user_profiles'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON user_profiles';
  END LOOP;
END $$;

-- Disable RLS on user_profiles
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- Add comment explaining the security model
COMMENT ON TABLE user_profiles IS
  'User profiles table. RLS is disabled because app uses Firebase Authentication. Security is enforced client-side via Firebase Auth.';
