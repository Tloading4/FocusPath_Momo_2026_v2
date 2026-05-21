/*
  # Fix Username Validation for Firebase Auth

  ## Problem
  The `check_username_available` function expects a UUID parameter, but Firebase Authentication 
  uses string IDs (not UUIDs). This causes username validation to fail when users try to change 
  their username, resulting in false "username already taken" errors.

  ## Solution
  Update the `check_username_available` function to:
  1. Accept TEXT instead of UUID for the exclude_user_id parameter
  2. Cast the comparison to work with both UUID and TEXT user IDs

  ## Security
  - No changes to RLS policies
  - No changes to data types in tables
  - Only updates the function signature for compatibility
*/

-- Update check_username_available function to accept TEXT and handle UUID conversion
CREATE OR REPLACE FUNCTION check_username_available(
  username text, 
  exclude_user_id text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  existing_count INTEGER;
BEGIN
  -- First validate format
  IF NOT validate_username_format(username) THEN
    RETURN FALSE;
  END IF;

  -- Check if username exists (case-insensitive)
  -- Convert both sides to TEXT for comparison to handle Firebase string IDs
  SELECT COUNT(*)
  INTO existing_count
  FROM user_profiles
  WHERE LOWER(display_name) = LOWER(username)
    AND (exclude_user_id IS NULL OR id::TEXT != exclude_user_id);

  RETURN existing_count = 0;
END;
$$;