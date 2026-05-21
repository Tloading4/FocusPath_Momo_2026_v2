/*
  # Create Notifications System

  1. New Tables
    - `user_notifications`
      - `id` (uuid, primary key)
      - `user_id` (text, references firebase user)
      - `type` (text, notification type)
      - `title` (text, notification title)
      - `description` (text, notification description)
      - `amount` (integer, XP amount if applicable)
      - `icon` (text, icon name or emoji)
      - `metadata` (jsonb, additional data)
      - `is_read` (boolean, read status)
      - `created_at` (timestamp)
    
    - `notification_preferences`
      - `user_id` (text, primary key, references firebase user)
      - `enable_xp_animations` (boolean)
      - `enable_levelup_overlays` (boolean)
      - `enable_notification_sounds` (boolean)
      - `show_small_xp_gains` (boolean)
      - `notification_retention_days` (integer)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their own notifications
    - Add auto-deletion policy for old notifications

  3. Indexes
    - Index on user_id and created_at for efficient queries
    - Index on user_id and is_read for unread count queries
*/

-- Create notifications table
CREATE TABLE IF NOT EXISTS user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  type text NOT NULL CHECK (type IN ('xp_gain', 'level_up', 'achievement', 'quest_complete', 'streak_milestone')),
  title text NOT NULL,
  description text NOT NULL,
  amount integer DEFAULT 0,
  icon text DEFAULT '🎉',
  metadata jsonb DEFAULT '{}'::jsonb,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id text PRIMARY KEY,
  enable_xp_animations boolean DEFAULT true,
  enable_levelup_overlays boolean DEFAULT true,
  enable_notification_sounds boolean DEFAULT true,
  show_small_xp_gains boolean DEFAULT true,
  notification_retention_days integer DEFAULT 30,
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_created 
  ON user_notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_read 
  ON user_notifications(user_id, is_read);

-- Enable RLS
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Policies for user_notifications
CREATE POLICY "Users can view own notifications"
  ON user_notifications FOR SELECT
  USING (user_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can insert own notifications"
  ON user_notifications FOR INSERT
  WITH CHECK (user_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can update own notifications"
  ON user_notifications FOR UPDATE
  USING (user_id = current_setting('app.current_user_id', true))
  WITH CHECK (user_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can delete own notifications"
  ON user_notifications FOR DELETE
  USING (user_id = current_setting('app.current_user_id', true));

-- Policies for notification_preferences
CREATE POLICY "Users can view own preferences"
  ON notification_preferences FOR SELECT
  USING (user_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can insert own preferences"
  ON notification_preferences FOR INSERT
  WITH CHECK (user_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can update own preferences"
  ON notification_preferences FOR UPDATE
  USING (user_id = current_setting('app.current_user_id', true))
  WITH CHECK (user_id = current_setting('app.current_user_id', true));

-- Function to auto-delete old notifications
CREATE OR REPLACE FUNCTION delete_old_notifications()
RETURNS trigger AS $$
BEGIN
  DELETE FROM user_notifications
  WHERE created_at < NOW() - INTERVAL '30 days';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to clean up old notifications daily
CREATE OR REPLACE FUNCTION create_notification_cleanup_trigger()
RETURNS void AS $$
BEGIN
  -- Drop trigger if exists
  DROP TRIGGER IF EXISTS trigger_delete_old_notifications ON user_notifications;
  
  -- Create trigger
  CREATE TRIGGER trigger_delete_old_notifications
    AFTER INSERT ON user_notifications
    EXECUTE FUNCTION delete_old_notifications();
END;
$$ LANGUAGE plpgsql;

SELECT create_notification_cleanup_trigger();