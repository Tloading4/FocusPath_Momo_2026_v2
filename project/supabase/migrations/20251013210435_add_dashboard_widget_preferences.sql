/*
  # Add Dashboard Widget Visibility Preferences

  1. Changes
    - Extends the existing `preferences` JSONB column in `user_profiles` table
    - Adds `dashboardWidgets` object to track visibility of individual widgets
    - Default state: all widgets visible
    - Widgets included:
      - xpProgress: XP and level progress card
      - streakTracker: Current and longest streak display
      - questsPreview: Active quests preview card
      - dailyTip: Daily productivity tip
      - personalizedTips: AI-powered personalized tips
      - collectionsPreview: Collections/avatars preview
      
  2. Security
    - No schema changes needed
    - Uses existing RLS policies on user_profiles table
    - Users can only update their own preferences

  3. Notes
    - This migration updates the default value for the preferences column
    - Existing users will get the new default when they update their preferences
    - The dashboard will gracefully handle missing preferences (default to visible)
*/

-- Update the default value for preferences column to include dashboardWidgets
ALTER TABLE user_profiles 
  ALTER COLUMN preferences 
  SET DEFAULT jsonb_build_object(
    'privacy', jsonb_build_object(
      'shareStats', true,
      'showInLeaderboard', true
    ),
    'defaults', jsonb_build_object(
      'aiMode', 'standard',
      'soundEnabled', true,
      'autoStartBreaks', false,
      'defaultSessionType', 'medium'
    ),
    'notifications', jsonb_build_object(
      'streakAlerts', true,
      'sessionReminders', true,
      'achievementNotifications', true
    ),
    'dashboardWidgets', jsonb_build_object(
      'xpProgress', true,
      'streakTracker', true,
      'questsPreview', true,
      'dailyTip', true,
      'personalizedTips', true,
      'collectionsPreview', true
    )
  );

-- Create an index on the preferences column for better query performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_preferences 
  ON user_profiles USING gin(preferences);

-- Add a comment to document the preferences structure
COMMENT ON COLUMN user_profiles.preferences IS 
  'User preferences including privacy settings, defaults, notifications, and dashboard widget visibility';
