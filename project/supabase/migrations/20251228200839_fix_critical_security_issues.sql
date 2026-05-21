/*
  # Fix Critical Security Issues

  ## Changes
  
  1. **Re-enable RLS on Notification Tables**
     - Enable RLS on `user_notifications` table
     - Enable RLS on `notification_preferences` table
     - Add proper policies for Firebase authenticated users
  
  2. **Fix Function Search Path Security**
     - Update `delete_old_notifications` function with secure search_path
     - Update `create_notification_cleanup_trigger` function with secure search_path
  
  3. **Remove Unused Indexes**
     - Drop `idx_focus_mode_sessions_subject_id`
     - Drop `idx_focus_mode_sessions_work_category_id`
     - Drop `idx_focus_sessions_user_id`
     - Drop `idx_distractions_session_id`
     - Drop `idx_distractions_user_id`
     - Drop `idx_momo_messages_conversation_id`
     - Drop `idx_minigame_sessions_user_id`
     - Drop `idx_user_quest_rotations_quest_template_id`
     - Drop `idx_quest_completion_history_user_id`
     - Drop `idx_user_notifications_user_created`

  ## Security Notes
  - RLS is now properly enabled to prevent unauthorized access
  - Functions use immutable search_path to prevent SQL injection
  - Unused indexes removed to reduce maintenance overhead
*/

-- ============================================================================
-- 1. RE-ENABLE RLS ON NOTIFICATION TABLES
-- ============================================================================

-- Enable RLS
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Users can view own notifications" ON user_notifications;
DROP POLICY IF EXISTS "Users can insert own notifications" ON user_notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON user_notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON user_notifications;
DROP POLICY IF EXISTS "Users can view own preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Users can insert own preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON notification_preferences;

-- Create secure policies for user_notifications
-- Using current_setting for Firebase user_id stored at connection level
CREATE POLICY "Users can view their own notifications"
  ON user_notifications FOR SELECT
  USING (user_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can insert their own notifications"
  ON user_notifications FOR INSERT
  WITH CHECK (user_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can update their own notifications"
  ON user_notifications FOR UPDATE
  USING (user_id = current_setting('app.current_user_id', true))
  WITH CHECK (user_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can delete their own notifications"
  ON user_notifications FOR DELETE
  USING (user_id = current_setting('app.current_user_id', true));

-- Create secure policies for notification_preferences
CREATE POLICY "Users can view their own preferences"
  ON notification_preferences FOR SELECT
  USING (user_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can insert their own preferences"
  ON notification_preferences FOR INSERT
  WITH CHECK (user_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can update their own preferences"
  ON notification_preferences FOR UPDATE
  USING (user_id = current_setting('app.current_user_id', true))
  WITH CHECK (user_id = current_setting('app.current_user_id', true));

-- ============================================================================
-- 2. FIX FUNCTION SEARCH PATH SECURITY
-- ============================================================================

-- Recreate delete_old_notifications with secure search_path
CREATE OR REPLACE FUNCTION delete_old_notifications()
RETURNS trigger 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM user_notifications
  WHERE created_at < NOW() - INTERVAL '30 days';
  RETURN NEW;
END;
$$;

-- Recreate create_notification_cleanup_trigger with secure search_path
CREATE OR REPLACE FUNCTION create_notification_cleanup_trigger()
RETURNS void 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Drop trigger if exists
  DROP TRIGGER IF EXISTS trigger_delete_old_notifications ON user_notifications;
  
  -- Create trigger
  CREATE TRIGGER trigger_delete_old_notifications
    AFTER INSERT ON user_notifications
    EXECUTE FUNCTION delete_old_notifications();
END;
$$;

-- ============================================================================
-- 3. DROP UNUSED INDEXES
-- ============================================================================

-- Drop unused indexes to improve performance and reduce maintenance
DROP INDEX IF EXISTS idx_focus_mode_sessions_subject_id;
DROP INDEX IF EXISTS idx_focus_mode_sessions_work_category_id;
DROP INDEX IF EXISTS idx_focus_sessions_user_id;
DROP INDEX IF EXISTS idx_distractions_session_id;
DROP INDEX IF EXISTS idx_distractions_user_id;
DROP INDEX IF EXISTS idx_momo_messages_conversation_id;
DROP INDEX IF EXISTS idx_minigame_sessions_user_id;
DROP INDEX IF EXISTS idx_user_quest_rotations_quest_template_id;
DROP INDEX IF EXISTS idx_quest_completion_history_user_id;
DROP INDEX IF EXISTS idx_user_notifications_user_created;