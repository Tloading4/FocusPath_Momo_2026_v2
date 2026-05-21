/*
  # Remove Foreign Key Constraint to auth.users

  ## Overview
  This migration removes the foreign key constraint from user_profiles.id to auth.users(id)
  because the application uses Firebase Authentication, not Supabase Auth.

  ## Changes Made
  
  ### 1. Drop Foreign Key Constraint
    - Removes the reference to auth.users(id)
    - Keeps the uuid primary key
    - Allows profiles to be created for Firebase-authenticated users
  
  ## Security
    - Maintains all existing RLS policies
    - No changes to access control
    - Only affects the table structure, not permissions
*/

-- Drop the foreign key constraint if it exists
DO $$
BEGIN
  -- Get the constraint name first
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_name = 'user_profiles'
    AND constraint_type = 'FOREIGN KEY'
    AND constraint_name LIKE '%auth_users%'
  ) THEN
    ALTER TABLE user_profiles
    DROP CONSTRAINT IF EXISTS user_profiles_id_fkey;
  END IF;
END $$;

-- Also try dropping any other foreign key constraints on the id column
DO $$
DECLARE
  constraint_name_var text;
BEGIN
  FOR constraint_name_var IN
    SELECT constraint_name
    FROM information_schema.table_constraints
    WHERE table_name = 'user_profiles'
    AND constraint_type = 'FOREIGN KEY'
    AND constraint_name != 'user_profiles_id_fkey'
  LOOP
    EXECUTE 'ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS ' || constraint_name_var;
  END LOOP;
END $$;

-- Add comment explaining why
COMMENT ON COLUMN user_profiles.id IS
  'User ID from Firebase Authentication (no foreign key to auth.users as app uses Firebase Auth)';
