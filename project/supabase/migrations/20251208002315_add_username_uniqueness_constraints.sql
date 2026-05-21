/*
  # Add Username Uniqueness and Validation Constraints

  ## Overview
  This migration enforces unique usernames (display_name) with format validation
  and adds support for handling existing duplicate usernames.

  ## Changes Made

  ### 1. New Columns
    - `username_needs_update` (boolean) - Flags users who need to choose a new username due to duplicates
    - `last_username_change` (timestamptz) - Tracks when username was last changed for cooldown enforcement

  ### 2. Constraints
    - Unique constraint on LOWER(display_name) for case-insensitive uniqueness
    - Check constraint for display_name length (3-20 characters)
    - Check constraint for display_name format (alphanumeric, underscores, hyphens only)
    - Check constraint to ensure display_name starts with alphanumeric character

  ### 3. Indexes
    - Unique index on LOWER(display_name) for efficient case-insensitive lookups

  ## Username Format Rules
    - Length: 3-20 characters
    - Allowed: letters (a-z, A-Z), numbers (0-9), underscores (_), hyphens (-)
    - Must start with a letter or number
    - Case-insensitive uniqueness (e.g., "JohnDoe" and "johndoe" cannot both exist)

  ## Security
    - Maintains existing RLS policies
    - No changes to access control
*/

-- Add new columns to user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'username_needs_update'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN username_needs_update boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'last_username_change'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN last_username_change timestamptz DEFAULT now();
  END IF;
END $$;

-- Create a unique index on lowercase display_name for case-insensitive uniqueness
-- Drop existing index if it exists
DROP INDEX IF EXISTS idx_user_profiles_display_name_lower_unique;

-- Create the unique index
CREATE UNIQUE INDEX idx_user_profiles_display_name_lower_unique
  ON user_profiles (LOWER(display_name));

-- Add check constraints for username format validation
-- Drop existing constraints if they exist
DO $$
BEGIN
  -- Drop constraints if they exist
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'user_profiles' AND constraint_name = 'display_name_length_check'
  ) THEN
    ALTER TABLE user_profiles DROP CONSTRAINT display_name_length_check;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'user_profiles' AND constraint_name = 'display_name_format_check'
  ) THEN
    ALTER TABLE user_profiles DROP CONSTRAINT display_name_format_check;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'user_profiles' AND constraint_name = 'display_name_start_check'
  ) THEN
    ALTER TABLE user_profiles DROP CONSTRAINT display_name_start_check;
  END IF;
END $$;

-- Add length constraint (3-20 characters)
ALTER TABLE user_profiles
  ADD CONSTRAINT display_name_length_check
  CHECK (char_length(display_name) >= 3 AND char_length(display_name) <= 20);

-- Add format constraint (alphanumeric, underscores, hyphens only)
ALTER TABLE user_profiles
  ADD CONSTRAINT display_name_format_check
  CHECK (display_name ~ '^[a-zA-Z0-9_-]+$');

-- Add constraint to ensure username starts with alphanumeric character
ALTER TABLE user_profiles
  ADD CONSTRAINT display_name_start_check
  CHECK (display_name ~ '^[a-zA-Z0-9]');

-- Create index for faster lookups by username_needs_update
CREATE INDEX IF NOT EXISTS idx_user_profiles_username_needs_update
  ON user_profiles(username_needs_update)
  WHERE username_needs_update = true;

-- Create index for last_username_change for cooldown checks
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_username_change
  ON user_profiles(last_username_change);

-- Comment explaining the constraints
COMMENT ON COLUMN user_profiles.display_name IS
  'Username (unique, case-insensitive, 3-20 chars, alphanumeric/underscore/hyphen, must start with alphanumeric)';
COMMENT ON COLUMN user_profiles.username_needs_update IS
  'Flag indicating user must choose a new username due to conflicts';
COMMENT ON COLUMN user_profiles.last_username_change IS
  'Timestamp of last username change for cooldown enforcement';
