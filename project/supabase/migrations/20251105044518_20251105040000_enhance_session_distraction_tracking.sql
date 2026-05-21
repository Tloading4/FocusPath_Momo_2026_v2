/*
  # Enhanced Session Distraction Tracking

  ## Overview
  This migration enhances the focus_sessions table to accurately track user focus
  and distraction behaviors during and after sessions. It adds detailed end behavior
  tracking to distinguish between focused users who end sessions immediately versus
  distracted users who delay or timeout.

  ## Changes Made

  ### 1. New Columns in focus_sessions
  - `end_reason_detailed` (text) - Specific reason for session end:
    * 'timer_complete_immediate' - Ended within 10 seconds (highly focused)
    * 'timer_complete_delayed' - Ended within 60 seconds (moderately focused)
    * 'timer_complete_timeout' - Did not end within 60 seconds (distracted)
    * 'manual_early' - User manually ended session early
    * 'manual_early_with_confirmation' - User confirmed early end
  - `time_to_end_after_completion_seconds` (integer) - Seconds between timer completion and user ending session
  - `end_attempt_count` (integer) - Number of times user clicked end button
  - `pause_count` (integer) - Number of times session was paused
  - `total_pause_duration_seconds` (integer) - Total seconds spent paused
  - `pause_penalty_applied` (boolean) - Whether pause penalty was applied to focus score
  - `timeout_penalty_applied` (boolean) - Whether timeout penalty was applied
  - `visibility_change_count` (integer) - Number of tab visibility changes during session
  - `actual_focus_duration_seconds` (integer) - Actual time spent focused (excluding pauses)

  ### 2. Distraction Events Tracking
  Enhances the existing distractions table with better context:
  - Added index for faster queries
  - Support for multiple distraction types

  ## Security
  - RLS policies remain unchanged
  - All new columns are optional for backward compatibility
  - Existing data remains valid

  ## Performance
  - Indexes added for common query patterns
  - Optimized for session history queries with distraction filtering
*/

-- Add new columns to focus_sessions table for detailed end behavior tracking
ALTER TABLE focus_sessions
  ADD COLUMN IF NOT EXISTS end_reason_detailed text,
  ADD COLUMN IF NOT EXISTS time_to_end_after_completion_seconds integer,
  ADD COLUMN IF NOT EXISTS end_attempt_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pause_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_pause_duration_seconds integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pause_penalty_applied boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS timeout_penalty_applied boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS visibility_change_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS actual_focus_duration_seconds integer;

-- Add comments to document the new columns
COMMENT ON COLUMN focus_sessions.end_reason_detailed IS 'Detailed reason for how session ended: timer_complete_immediate, timer_complete_delayed, timer_complete_timeout, manual_early';
COMMENT ON COLUMN focus_sessions.time_to_end_after_completion_seconds IS 'Seconds between timer reaching 0 and user clicking end session button';
COMMENT ON COLUMN focus_sessions.end_attempt_count IS 'Number of times user clicked end session button';
COMMENT ON COLUMN focus_sessions.pause_count IS 'Number of times user paused the session';
COMMENT ON COLUMN focus_sessions.total_pause_duration_seconds IS 'Total seconds the session was paused';
COMMENT ON COLUMN focus_sessions.pause_penalty_applied IS 'Whether a focus score penalty was applied for pausing';
COMMENT ON COLUMN focus_sessions.timeout_penalty_applied IS 'Whether a focus score penalty was applied for timing out';
COMMENT ON COLUMN focus_sessions.actual_focus_duration_seconds IS 'Actual seconds of focused time, excluding pauses';

-- Create index for querying sessions by end behavior (for analytics)
CREATE INDEX IF NOT EXISTS idx_focus_sessions_end_reason ON focus_sessions(end_reason_detailed);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_completed_end_reason ON focus_sessions(completed, end_reason_detailed);

-- Create index for distraction analysis queries
CREATE INDEX IF NOT EXISTS idx_focus_sessions_distraction_analysis ON focus_sessions(user_id, completed, distraction_count, pause_count);

-- Add index for time-based queries (finding sessions with timeout issues)
CREATE INDEX IF NOT EXISTS idx_focus_sessions_timeout ON focus_sessions(user_id, timeout_penalty_applied) WHERE timeout_penalty_applied = true;

-- Update the distractions table with additional context field
ALTER TABLE distractions
  ADD COLUMN IF NOT EXISTS severity text DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS recovered boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS recovery_time_seconds integer;

COMMENT ON COLUMN distractions.severity IS 'Severity level: low, medium, high';
COMMENT ON COLUMN distractions.recovered IS 'Whether user successfully returned to focus';
COMMENT ON COLUMN distractions.recovery_time_seconds IS 'Seconds taken to recover from distraction';

-- Create function to calculate focus quality score based on distraction patterns
CREATE OR REPLACE FUNCTION calculate_focus_quality(
  p_completed boolean,
  p_completion_percentage integer,
  p_distraction_count integer,
  p_pause_count integer,
  p_timeout_penalty boolean,
  p_time_to_end integer
)
RETURNS integer AS $$
DECLARE
  base_score integer;
  quality_score integer;
BEGIN
  -- Start with completion percentage
  base_score := COALESCE(p_completion_percentage, 0);

  -- Apply distraction penalty (5 points per distraction, max 30)
  quality_score := base_score - LEAST(p_distraction_count * 5, 30);

  -- Apply pause penalty (5 points per pause, max 40)
  quality_score := quality_score - LEAST(p_pause_count * 5, 40);

  -- Apply timeout penalty (30 points)
  IF p_timeout_penalty THEN
    quality_score := quality_score - 30;
  END IF;

  -- Bonus for immediate ending (within 10 seconds of completion)
  IF p_completed AND p_time_to_end IS NOT NULL AND p_time_to_end <= 10 THEN
    quality_score := quality_score + 10;
  END IF;

  -- Ensure score stays within 0-100 range
  quality_score := GREATEST(0, LEAST(100, quality_score));

  RETURN quality_score;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_focus_quality IS 'Calculates a focus quality score based on session completion and distraction patterns';

-- Create view for session quality analysis
CREATE OR REPLACE VIEW session_quality_summary AS
SELECT
  fs.id,
  fs.user_id,
  fs.session_type,
  fs.completed,
  fs.focus_score,
  fs.distraction_count,
  fs.pause_count,
  fs.timeout_penalty_applied,
  fs.time_to_end_after_completion_seconds,
  fs.end_reason_detailed,
  -- Classify focus quality
  CASE
    WHEN fs.completed AND fs.time_to_end_after_completion_seconds <= 10 AND fs.pause_count = 0 THEN 'excellent'
    WHEN fs.completed AND fs.time_to_end_after_completion_seconds <= 60 AND fs.pause_count <= 1 THEN 'good'
    WHEN fs.completed AND fs.pause_count <= 3 THEN 'fair'
    WHEN fs.completed THEN 'poor'
    ELSE 'incomplete'
  END as focus_quality,
  -- Calculate actual focus percentage
  CASE
    WHEN fs.duration_planned > 0 THEN
      ROUND((fs.actual_focus_duration_seconds::numeric / (fs.duration_planned * 60)) * 100, 2)
    ELSE 0
  END as actual_focus_percentage
FROM focus_sessions fs;

COMMENT ON VIEW session_quality_summary IS 'Summary view of session quality metrics for analytics';
