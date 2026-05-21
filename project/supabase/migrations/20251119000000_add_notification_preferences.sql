/*
  # Add Notification Preferences to User Settings

  1. Overview
    This migration adds support for timer completion notification preferences
    including browser notifications, tab alerts, and repeating sound alerts.

  2. Changes
    - No new tables required - preferences are stored in existing user settings JSON
    - This migration serves as documentation for the new settings fields:
      * notificationsEnabled: boolean - Enable browser notifications
      * tabFlashEnabled: boolean - Enable tab title flashing
      * repeatingSoundEnabled: boolean - Enable repeating sound alerts
      * repeatingSoundInterval: number - Seconds between sound repeats (10-60)

  3. Security
    - No RLS changes needed as these are stored in user profile preferences
    - Only users can modify their own notification settings

  4. Notes
    - Settings are stored in userProfiles.settings.preferences JSON field
    - Default values are handled in the application layer
    - All settings default to safe, non-intrusive values
*/

-- This migration serves as documentation for the notification preferences feature
-- No database schema changes are needed as preferences are stored in JSON fields
-- that already exist in the userProfiles collection in Firestore

-- Future considerations if migrating to pure Supabase:
-- ALTER TABLE user_profiles
-- ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
--   "notificationsEnabled": true,
--   "tabFlashEnabled": true,
--   "repeatingSoundEnabled": false,
--   "repeatingSoundInterval": 30
-- }'::jsonb;
