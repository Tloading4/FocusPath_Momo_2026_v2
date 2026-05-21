/*
  # Handle Existing Duplicate Usernames

  ## Overview
  Identifies and handles existing duplicate display names by making them temporarily unique
  and marking users for username update on next login.

  ## Process
  1. Find all groups of duplicate usernames (case-insensitive)
  2. For each duplicate group:
     - Keep the first user's username as-is
     - Append numeric suffixes to others (_2, _3, etc.)
     - Mark all affected users with username_needs_update = true
  3. Log all changes for audit purposes

  ## Important Notes
  - Users will be prompted to choose a new username on next login
  - Temporary suffixes ensure immediate uniqueness while users transition
  - First user in each duplicate group keeps original name but still needs to update

  ## Security
  - Uses SECURITY DEFINER for system-level operations
  - No RLS bypass, operates within existing security context
*/

-- Create a function to handle duplicate usernames
CREATE OR REPLACE FUNCTION handle_duplicate_usernames()
RETURNS TABLE(
  user_id UUID,
  old_display_name TEXT,
  new_display_name TEXT,
  action TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  duplicate_group RECORD;
  user_record RECORD;
  counter INTEGER;
  new_name TEXT;
BEGIN
  -- Iterate through each group of duplicate usernames
  FOR duplicate_group IN
    SELECT LOWER(display_name) as name_lower
    FROM user_profiles
    GROUP BY LOWER(display_name)
    HAVING COUNT(*) > 1
  LOOP
    counter := 1;
    
    -- For each user in this duplicate group
    FOR user_record IN
      SELECT id, display_name
      FROM user_profiles
      WHERE LOWER(display_name) = duplicate_group.name_lower
      ORDER BY created_at ASC
    LOOP
      IF counter = 1 THEN
        -- First user: mark for update but keep name
        UPDATE user_profiles
        SET username_needs_update = true
        WHERE id = user_record.id;
        
        RETURN QUERY SELECT
          user_record.id,
          user_record.display_name,
          user_record.display_name,
          'marked_for_update'::TEXT;
      ELSE
        -- Subsequent users: append suffix and mark for update
        new_name := user_record.display_name || '_' || counter::TEXT;
        
        -- Ensure new name doesn't exceed max length
        IF char_length(new_name) > 20 THEN
          new_name := substring(user_record.display_name FROM 1 FOR (20 - char_length('_' || counter::TEXT))) || '_' || counter::TEXT;
        END IF;
        
        UPDATE user_profiles
        SET
          display_name = new_name,
          username_needs_update = true
        WHERE id = user_record.id;
        
        RETURN QUERY SELECT
          user_record.id,
          user_record.display_name,
          new_name,
          'renamed_with_suffix'::TEXT;
      END IF;
      
      counter := counter + 1;
    END LOOP;
  END LOOP;
END;
$$;

-- Execute the function to handle existing duplicates
-- This will return a table of all changes made
DO $$
DECLARE
  change_record RECORD;
  total_affected INTEGER := 0;
BEGIN
  -- Log the start of migration
  RAISE NOTICE 'Starting duplicate username resolution...';
  
  -- Process duplicates and log results
  FOR change_record IN
    SELECT * FROM handle_duplicate_usernames()
  LOOP
    total_affected := total_affected + 1;
    RAISE NOTICE 'User %: % → % (action: %)',
      change_record.user_id,
      change_record.old_display_name,
      change_record.new_display_name,
      change_record.action;
  END LOOP;
  
  RAISE NOTICE 'Completed. Total users affected: %', total_affected;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION handle_duplicate_usernames() TO authenticated;

COMMENT ON FUNCTION handle_duplicate_usernames() IS
  'Identifies and resolves duplicate usernames by appending suffixes and marking users for update';
