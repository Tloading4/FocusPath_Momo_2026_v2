/*
  # Username Validation Database Functions

  ## Overview
  Creates database functions for validating username format and checking availability.

  ## Functions Created

  ### 1. validate_username_format(username TEXT)
    - Returns boolean indicating if username meets format requirements
    - Checks: length (3-20), allowed characters, starts with alphanumeric

  ### 2. check_username_available(username TEXT, user_id UUID)
    - Returns boolean indicating if username is available
    - Handles case-insensitive comparison
    - Excludes current user (for username changes)

  ### 3. suggest_usernames(base_username TEXT, limit_count INTEGER)
    - Returns array of available username suggestions
    - Adds numeric suffixes to base username

  ### 4. get_duplicate_usernames()
    - Returns list of display_names that have duplicates
    - Used for identifying conflicts during migration

  ## Security
    - Functions use SECURITY DEFINER where needed for system operations
    - Input validation to prevent SQL injection
*/

-- Function to validate username format
CREATE OR REPLACE FUNCTION validate_username_format(username TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Check length
  IF char_length(username) < 3 OR char_length(username) > 20 THEN
    RETURN FALSE;
  END IF;

  -- Check format (alphanumeric, underscore, hyphen only)
  IF username !~ '^[a-zA-Z0-9_-]+$' THEN
    RETURN FALSE;
  END IF;

  -- Check starts with alphanumeric
  IF username !~ '^[a-zA-Z0-9]' THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$;

-- Function to check if username is available
CREATE OR REPLACE FUNCTION check_username_available(
  username TEXT,
  exclude_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  existing_count INTEGER;
BEGIN
  -- First validate format
  IF NOT validate_username_format(username) THEN
    RETURN FALSE;
  END IF;

  -- Check if username exists (case-insensitive)
  SELECT COUNT(*)
  INTO existing_count
  FROM user_profiles
  WHERE LOWER(display_name) = LOWER(username)
    AND (exclude_user_id IS NULL OR id != exclude_user_id);

  RETURN existing_count = 0;
END;
$$;

-- Function to suggest available usernames
CREATE OR REPLACE FUNCTION suggest_usernames(
  base_username TEXT,
  limit_count INTEGER DEFAULT 5
)
RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  suggestions TEXT[] := '{}';
  candidate TEXT;
  counter INTEGER := 2;
  max_attempts INTEGER := 100;
BEGIN
  -- Sanitize base username to meet format requirements
  base_username := regexp_replace(base_username, '[^a-zA-Z0-9_-]', '', 'g');
  base_username := substring(base_username FROM 1 FOR 17);
  
  -- Ensure base username starts with alphanumeric
  IF base_username !~ '^[a-zA-Z0-9]' THEN
    base_username := 'user' || base_username;
  END IF;

  -- If base username is too short, pad it
  IF char_length(base_username) < 3 THEN
    base_username := base_username || '123';
  END IF;

  -- Try base username first
  IF check_username_available(base_username, NULL) THEN
    suggestions := array_append(suggestions, base_username);
  END IF;

  -- Generate numbered suggestions
  WHILE array_length(suggestions, 1) < limit_count AND counter < max_attempts LOOP
    candidate := base_username || counter::TEXT;
    
    -- Ensure candidate doesn't exceed max length
    IF char_length(candidate) <= 20 AND check_username_available(candidate, NULL) THEN
      suggestions := array_append(suggestions, candidate);
    END IF;
    
    counter := counter + 1;
  END LOOP;

  RETURN suggestions;
END;
$$;

-- Function to get duplicate usernames (for migration purposes)
CREATE OR REPLACE FUNCTION get_duplicate_usernames()
RETURNS TABLE(display_name_lower TEXT, duplicate_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    LOWER(up.display_name) as display_name_lower,
    COUNT(*) as duplicate_count
  FROM user_profiles up
  GROUP BY LOWER(up.display_name)
  HAVING COUNT(*) > 1
  ORDER BY duplicate_count DESC;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION validate_username_format(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_username_available(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION suggest_usernames(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_duplicate_usernames() TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION validate_username_format(TEXT) IS
  'Validates if a username meets format requirements (3-20 chars, alphanumeric/underscore/hyphen, starts with alphanumeric)';
COMMENT ON FUNCTION check_username_available(TEXT, UUID) IS
  'Checks if a username is available (case-insensitive), optionally excluding a specific user ID';
COMMENT ON FUNCTION suggest_usernames(TEXT, INTEGER) IS
  'Generates a list of available username suggestions based on a base username';
COMMENT ON FUNCTION get_duplicate_usernames() IS
  'Returns list of display names that have duplicates for migration purposes';
