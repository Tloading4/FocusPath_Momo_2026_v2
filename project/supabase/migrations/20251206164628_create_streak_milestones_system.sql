/*
  # Create Streak Milestones System

  1. New Tables
    - `streak_milestones`
      - `id` (uuid, primary key)
      - `user_id` (text, references auth.users)
      - `milestone_days` (integer, the streak day milestone reached)
      - `xp_awarded` (integer, XP awarded for this milestone)
      - `achieved_at` (timestamptz, when milestone was reached)
      - `current_streak_at_time` (integer, what their current streak was)

  2. Indexes
    - Index on user_id for fast lookups
    - Index on milestone_days for filtering

  3. Security
    - Enable RLS on `streak_milestones` table
    - Add policy for authenticated users to read their own milestones
    - Add policy for authenticated users to insert their own milestones
*/

-- Create streak_milestones table
CREATE TABLE IF NOT EXISTS streak_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  milestone_days integer NOT NULL,
  xp_awarded integer NOT NULL DEFAULT 0,
  achieved_at timestamptz DEFAULT now(),
  current_streak_at_time integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_streak_milestones_user_id 
  ON streak_milestones(user_id);

CREATE INDEX IF NOT EXISTS idx_streak_milestones_milestone_days 
  ON streak_milestones(milestone_days);

CREATE INDEX IF NOT EXISTS idx_streak_milestones_achieved_at 
  ON streak_milestones(achieved_at DESC);

-- Enable RLS
ALTER TABLE streak_milestones ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own streak milestones
CREATE POLICY "Users can read own streak milestones"
  ON streak_milestones
  FOR SELECT
  TO authenticated
  USING (user_id = current_user);

-- Policy: Users can insert their own streak milestones
CREATE POLICY "Users can insert own streak milestones"
  ON streak_milestones
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = current_user);

-- Policy: Users can read their own milestones (public access)
CREATE POLICY "Public users can read own streak milestones"
  ON streak_milestones
  FOR SELECT
  TO public
  USING (user_id = current_user);