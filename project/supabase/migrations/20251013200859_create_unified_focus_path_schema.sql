/*
  # Unified Focus Path Schema for Cross-Platform Sync

  ## Overview
  This migration creates a comprehensive schema for seamless synchronization between
  the Chrome extension and web application. All data is centralized in Supabase for
  real-time cross-platform functionality.

  ## New Tables Created

  ### 1. user_profiles
  Stores user profile information, XP, levels, streaks, and settings
  - `id` (uuid, primary key) - User ID from auth.users
  - `display_name` (text) - User's display name
  - `email` (text) - User's email address
  - `total_xp` (integer) - Total experience points earned
  - `current_level` (integer) - Current level based on XP
  - `current_streak` (integer) - Current daily streak
  - `longest_streak` (integer) - Longest streak achieved
  - `last_session_date` (timestamptz) - Last session completion date
  - `profile_completed` (boolean) - Whether initial profile setup is done
  - `preferences` (jsonb) - User preferences and settings
  - `marketplace_data` (jsonb) - Purchased items and equipped gear
  - `created_at` (timestamptz) - Profile creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 2. focus_sessions
  Tracks all focus sessions across both platforms
  - `id` (uuid, primary key) - Unique session ID
  - `user_id` (uuid) - Reference to user_profiles
  - `session_type` (text) - Type of session (easy, medium, hard, extreme)
  - `duration_planned` (integer) - Planned duration in minutes
  - `duration_actual` (integer) - Actual duration in minutes
  - `start_time` (timestamptz) - Session start timestamp
  - `end_time` (timestamptz) - Session end timestamp (null if active)
  - `end_reason` (text) - How session ended (timer_end, manual, idle_break)
  - `completed` (boolean) - Whether session was completed successfully
  - `xp_earned` (integer) - XP earned from this session
  - `focus_score` (integer) - Final focus score (0-100)
  - `distraction_count` (integer) - Number of distractions detected
  - `tab_switch_count` (integer) - Number of tab switches
  - `custom_task` (text) - Custom task description
  - `category` (text) - Session category (school, work, general, etc.)
  - `session_metadata` (jsonb) - Additional session data
  - `source_platform` (text) - Where session was started (extension, webapp)
  - `created_at` (timestamptz) - Record creation timestamp

  ### 3. distractions
  Logs all distraction events during focus sessions
  - `id` (uuid, primary key) - Unique distraction ID
  - `session_id` (uuid) - Reference to focus_sessions
  - `user_id` (uuid) - Reference to user_profiles
  - `distraction_type` (text) - Type (tab_switch, window_blur, inactivity, manual, etc.)
  - `context` (text) - Additional context about the distraction
  - `timestamp` (timestamptz) - When distraction occurred
  - `session_elapsed_ms` (bigint) - Time elapsed in session when distraction occurred

  ### 4. achievements
  Stores user achievements and milestones
  - `id` (uuid, primary key) - Unique achievement ID
  - `user_id` (uuid) - Reference to user_profiles
  - `achievement_key` (text) - Unique key for achievement type
  - `achievement_name` (text) - Display name
  - `description` (text) - Achievement description
  - `xp_reward` (integer) - XP rewarded
  - `unlocked_at` (timestamptz) - When achievement was unlocked
  - `metadata` (jsonb) - Additional achievement data

  ### 5. sync_status
  Tracks synchronization state for offline support
  - `id` (uuid, primary key) - Unique sync record ID
  - `user_id` (uuid) - Reference to user_profiles
  - `entity_type` (text) - Type of entity (session, profile, distraction)
  - `entity_id` (uuid) - ID of the entity being synced
  - `last_synced_at` (timestamptz) - Last successful sync timestamp
  - `sync_version` (integer) - Version number for conflict resolution
  - `platform` (text) - Platform that made the change (extension, webapp)

  ## Security
  - Row Level Security (RLS) enabled on all tables
  - Users can only access their own data
  - Policies for SELECT, INSERT, UPDATE, DELETE operations
  - Authentication required for all operations

  ## Indexes
  - Performance indexes on frequently queried columns
  - Composite indexes for common query patterns
*/

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT 'Focus Warrior',
  email text,
  total_xp integer NOT NULL DEFAULT 0,
  current_level integer NOT NULL DEFAULT 1,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_session_date timestamptz,
  profile_completed boolean NOT NULL DEFAULT false,
  preferences jsonb DEFAULT '{
    "notifications": {
      "sessionReminders": true,
      "streakAlerts": true,
      "achievementNotifications": true
    },
    "defaults": {
      "defaultSessionType": "medium",
      "autoStartBreaks": false,
      "soundEnabled": true,
      "aiMode": "standard"
    },
    "privacy": {
      "showInLeaderboard": true,
      "shareStats": true
    }
  }'::jsonb,
  marketplace_data jsonb DEFAULT '{
    "purchases": [],
    "equipped": {},
    "availableXP": 0
  }'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create focus_sessions table
CREATE TABLE IF NOT EXISTS focus_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  session_type text NOT NULL,
  duration_planned integer NOT NULL,
  duration_actual integer DEFAULT 0,
  start_time timestamptz NOT NULL DEFAULT now(),
  end_time timestamptz,
  end_reason text,
  completed boolean NOT NULL DEFAULT false,
  xp_earned integer NOT NULL DEFAULT 0,
  focus_score integer NOT NULL DEFAULT 100,
  distraction_count integer NOT NULL DEFAULT 0,
  tab_switch_count integer NOT NULL DEFAULT 0,
  custom_task text,
  category text DEFAULT 'general',
  session_metadata jsonb DEFAULT '{}'::jsonb,
  source_platform text NOT NULL DEFAULT 'webapp',
  created_at timestamptz DEFAULT now()
);

-- Create distractions table
CREATE TABLE IF NOT EXISTS distractions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES focus_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  distraction_type text NOT NULL,
  context text,
  timestamp timestamptz NOT NULL DEFAULT now(),
  session_elapsed_ms bigint NOT NULL DEFAULT 0
);

-- Create achievements table
CREATE TABLE IF NOT EXISTS achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  achievement_key text NOT NULL,
  achievement_name text NOT NULL,
  description text,
  xp_reward integer NOT NULL DEFAULT 0,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  UNIQUE(user_id, achievement_key)
);

-- Create sync_status table
CREATE TABLE IF NOT EXISTS sync_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  sync_version integer NOT NULL DEFAULT 1,
  platform text NOT NULL,
  UNIQUE(user_id, entity_type, entity_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_id ON focus_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_start_time ON focus_sessions(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_time ON focus_sessions(user_id, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_distractions_session_id ON distractions(session_id);
CREATE INDEX IF NOT EXISTS idx_distractions_user_id ON distractions(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_status_user_entity ON sync_status(user_id, entity_type);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE distractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_status ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- RLS Policies for focus_sessions
CREATE POLICY "Users can view own sessions"
  ON focus_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sessions"
  ON focus_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON focus_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
  ON focus_sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for distractions
CREATE POLICY "Users can view own distractions"
  ON distractions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own distractions"
  ON distractions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for achievements
CREATE POLICY "Users can view own achievements"
  ON achievements FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own achievements"
  ON achievements FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for sync_status
CREATE POLICY "Users can view own sync status"
  ON sync_status FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own sync status"
  ON sync_status FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sync status"
  ON sync_status FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for user_profiles
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();