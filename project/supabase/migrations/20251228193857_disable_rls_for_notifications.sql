/*
  # Disable RLS for Notifications Tables

  1. Changes
    - Disable RLS on user_notifications table
    - Disable RLS on notification_preferences table
    - Drop existing policies

  2. Reason
    - Using Firebase authentication for access control
    - Application-level security instead of database-level RLS
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own notifications" ON user_notifications;
DROP POLICY IF EXISTS "Users can insert own notifications" ON user_notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON user_notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON user_notifications;
DROP POLICY IF EXISTS "Users can view own preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Users can insert own preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON notification_preferences;

-- Disable RLS
ALTER TABLE user_notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences DISABLE ROW LEVEL SECURITY;
