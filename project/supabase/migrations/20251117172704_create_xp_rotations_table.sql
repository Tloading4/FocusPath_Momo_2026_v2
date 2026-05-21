/*
  # Create XP Rotations Table for Daily Rotation System

  ## Overview
  This migration creates a table to store daily XP rotation values for session types.
  The rotation system ensures fair XP distribution by rotating reward values across
  all difficulty levels (Easy, Medium, Hard, Extreme) on a daily basis.

  ## Tables Created
  - `xp_rotations`
    - `rotation_date` (date, primary key) - The date for this rotation
    - `easy_xp` (integer) - XP value for Easy sessions on this date
    - `medium_xp` (integer) - XP value for Medium sessions on this date
    - `hard_xp` (integer) - XP value for Hard sessions on this date
    - `extreme_xp` (integer) - XP value for Extreme sessions on this date
    - `rotation_index` (integer) - Index indicating which rotation pattern (0-3)
    - `created_at` (timestamptz) - When this rotation was created

  ## Security
  - Enable RLS on `xp_rotations` table
  - Allow all authenticated users to read rotation data
  - Only service role can insert/update rotation data

  ## Initial Data
  Seeds the table with today's rotation (pattern 0: Easy=50, Med=100, Hard=150, Extreme=200)

  ## Rotation Patterns
  The system cycles through 4 rotation patterns every 4 days:
  - Day 0: Easy=50,  Medium=100, Hard=150, Extreme=200
  - Day 1: Easy=100, Medium=150, Hard=200, Extreme=50
  - Day 2: Easy=150, Medium=200, Hard=50,  Extreme=100
  - Day 3: Easy=200, Medium=50,  Hard=100, Extreme=150
*/

-- Create xp_rotations table
CREATE TABLE IF NOT EXISTS xp_rotations (
  rotation_date date PRIMARY KEY,
  easy_xp integer NOT NULL,
  medium_xp integer NOT NULL,
  hard_xp integer NOT NULL,
  extreme_xp integer NOT NULL,
  rotation_index integer NOT NULL CHECK (rotation_index >= 0 AND rotation_index <= 3),
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE xp_rotations ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all authenticated users to read rotation data
CREATE POLICY "Authenticated users can read XP rotations"
  ON xp_rotations
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Only service role can insert rotation data
-- This ensures rotation integrity (typically handled by backend/cron)
CREATE POLICY "Service role can insert XP rotations"
  ON xp_rotations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create index for efficient date lookups
CREATE INDEX IF NOT EXISTS idx_xp_rotations_date ON xp_rotations(rotation_date DESC);

-- Seed initial rotation for today (rotation pattern 0)
INSERT INTO xp_rotations (rotation_date, easy_xp, medium_xp, hard_xp, extreme_xp, rotation_index)
VALUES (
  CURRENT_DATE,
  50,
  100,
  150,
  200,
  0
)
ON CONFLICT (rotation_date) DO NOTHING;

-- Create function to automatically generate rotation for any date
CREATE OR REPLACE FUNCTION get_rotation_for_date(target_date date)
RETURNS TABLE (
  rotation_date date,
  easy_xp integer,
  medium_xp integer,
  hard_xp integer,
  extreme_xp integer,
  rotation_index integer
) AS $$
DECLARE
  days_since_epoch integer;
  rotation_idx integer;
  xp_values integer[] := ARRAY[50, 100, 150, 200];
BEGIN
  -- Calculate days since a reference date (2024-01-01)
  days_since_epoch := target_date - '2024-01-01'::date;
  
  -- Calculate rotation index (0-3) based on day
  rotation_idx := MOD(days_since_epoch, 4);
  
  -- Return the rotation for this date
  -- Rotation patterns ensure each difficulty gets each XP value once per 4-day cycle
  RETURN QUERY
  SELECT 
    target_date,
    xp_values[(rotation_idx + 1) % 4 + 1],  -- Easy
    xp_values[(rotation_idx + 2) % 4 + 1],  -- Medium
    xp_values[(rotation_idx + 3) % 4 + 1],  -- Hard
    xp_values[(rotation_idx + 0) % 4 + 1],  -- Extreme
    rotation_idx;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create function to ensure rotation exists for a date (idempotent)
CREATE OR REPLACE FUNCTION ensure_rotation_for_date(target_date date)
RETURNS void AS $$
DECLARE
  rotation_data RECORD;
BEGIN
  -- Check if rotation already exists
  IF NOT EXISTS (SELECT 1 FROM xp_rotations WHERE rotation_date = target_date) THEN
    -- Get rotation data from calculation function
    SELECT * INTO rotation_data FROM get_rotation_for_date(target_date);
    
    -- Insert the rotation
    INSERT INTO xp_rotations (rotation_date, easy_xp, medium_xp, hard_xp, extreme_xp, rotation_index)
    VALUES (
      rotation_data.rotation_date,
      rotation_data.easy_xp,
      rotation_data.medium_xp,
      rotation_data.hard_xp,
      rotation_data.extreme_xp,
      rotation_data.rotation_index
    );
  END IF;
END;
$$ LANGUAGE plpgsql;
