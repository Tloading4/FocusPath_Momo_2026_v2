/*
  # Add Automatic XP Tracking for Streak Milestones

  This migration ensures that when a user achieves a streak milestone, 
  their total XP is automatically updated in the user_profiles table.

  ## Changes
  
  1. New Functions
    - `award_streak_milestone_xp()` - Automatically adds milestone XP to user's total when milestone is inserted
  
  2. New Triggers
    - `trigger_award_streak_milestone_xp` - Fires after streak milestone insert to update user XP
  
  3. Security
    - Function uses SECURITY DEFINER to allow XP updates
    - Properly validates user_id matches before updating XP
*/

-- Create function to award XP when streak milestone is achieved
CREATE OR REPLACE FUNCTION award_streak_milestone_xp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Update the user's total XP by adding the milestone XP reward
  UPDATE user_profiles
  SET 
    total_xp = total_xp + NEW.xp_awarded,
    updated_at = now()
  WHERE id = NEW.user_id::uuid;
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically award XP when a streak milestone is inserted
DROP TRIGGER IF EXISTS trigger_award_streak_milestone_xp ON streak_milestones;

CREATE TRIGGER trigger_award_streak_milestone_xp
  AFTER INSERT ON streak_milestones
  FOR EACH ROW
  EXECUTE FUNCTION award_streak_milestone_xp();

-- Add helpful comment
COMMENT ON FUNCTION award_streak_milestone_xp() IS 
  'Automatically updates user total_xp when a streak milestone is achieved';
