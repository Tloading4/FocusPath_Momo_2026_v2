/*
  # Create Quest System Tables

  ## Overview
  This migration creates a comprehensive quest system for Focus Path with support for
  daily and weekly quests, rotation mechanics, and historical tracking.

  ## New Tables

  ### 1. `quest_templates`
  Stores all available quest definitions that can be assigned to users
  - `id` (uuid, primary key) - Unique identifier for quest template
  - `quest_key` (text, unique) - Unique key for quest (e.g., 'daily_focus_warrior')
  - `title` (text) - Display title
  - `description` (text) - Quest description
  - `type` (text) - 'daily' or 'weekly'
  - `category` (text) - Quest category (sessions, streaks, focus, xp, special)
  - `difficulty` (text) - easy, medium, hard, extreme, legendary
  - `target_value` (integer) - Target amount to complete
  - `metric_type` (text) - What to measure (sessions, perfect_sessions, etc.)
  - `reward_xp` (integer) - XP reward for completion
  - `reward_items` (jsonb) - Array of item IDs as rewards
  - `reward_powerups` (jsonb) - Array of powerup IDs as rewards
  - `icon_emoji` (text) - Emoji icon for quest
  - `is_active` (boolean) - Whether quest is available
  - `unlock_level` (integer) - Minimum user level to see quest
  - `created_at` (timestamptz) - Creation timestamp

  ### 2. `user_quest_rotations`
  Tracks which quests are active for each user during a time period
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key) - References auth.users
  - `quest_template_id` (uuid, foreign key) - References quest_templates
  - `quest_key` (text) - Cached quest key for easy lookup
  - `rotation_date` (date) - Date this quest became active (for daily = day, weekly = week start)
  - `quest_type` (text) - 'daily' or 'weekly'
  - `progress` (integer) - Current progress toward target
  - `completed` (boolean) - Whether quest is completed
  - `completed_at` (timestamptz) - When quest was completed
  - `claimed` (boolean) - Whether rewards were claimed
  - `claimed_at` (timestamptz) - When rewards were claimed
  - `expires_at` (timestamptz) - When this quest rotation expires
  - `created_at` (timestamptz) - Creation timestamp

  ### 3. `quest_completion_history`
  Historical record of all completed quests for analytics
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key) - References auth.users
  - `quest_template_id` (uuid) - Which quest template
  - `quest_key` (text) - Quest key for reference
  - `quest_type` (text) - 'daily' or 'weekly'
  - `difficulty` (text) - Difficulty level
  - `completion_date` (date) - Date completed
  - `time_to_complete_hours` (numeric) - How long it took
  - `reward_xp` (integer) - XP earned
  - `created_at` (timestamptz) - Record creation

  ## Security
  - Row Level Security (RLS) enabled on all tables
  - Users can only read their own quest rotations and history
  - Quest templates are readable by all authenticated users
  - Only authenticated users can update their progress

  ## Indexes
  - Optimized for quest lookups by user, date, and type
  - Performance indexes on rotation queries
*/

-- Create quest_templates table
CREATE TABLE IF NOT EXISTS quest_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_key text UNIQUE NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  type text NOT NULL CHECK (type IN ('daily', 'weekly')),
  category text NOT NULL CHECK (category IN ('sessions', 'streaks', 'focus', 'xp', 'special', 'endurance', 'perfection', 'speed')),
  difficulty text NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard', 'extreme', 'legendary')),
  target_value integer NOT NULL CHECK (target_value > 0),
  metric_type text NOT NULL,
  reward_xp integer NOT NULL DEFAULT 0,
  reward_items jsonb DEFAULT '[]'::jsonb,
  reward_powerups jsonb DEFAULT '[]'::jsonb,
  icon_emoji text NOT NULL DEFAULT '🎯',
  is_active boolean DEFAULT true,
  unlock_level integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create user_quest_rotations table
CREATE TABLE IF NOT EXISTS user_quest_rotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quest_template_id uuid NOT NULL REFERENCES quest_templates(id) ON DELETE CASCADE,
  quest_key text NOT NULL,
  rotation_date date NOT NULL,
  quest_type text NOT NULL CHECK (quest_type IN ('daily', 'weekly')),
  progress integer DEFAULT 0,
  completed boolean DEFAULT false,
  completed_at timestamptz,
  claimed boolean DEFAULT false,
  claimed_at timestamptz,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, quest_template_id, rotation_date)
);

-- Create quest_completion_history table
CREATE TABLE IF NOT EXISTS quest_completion_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quest_template_id uuid NOT NULL,
  quest_key text NOT NULL,
  quest_type text NOT NULL,
  difficulty text NOT NULL,
  completion_date date NOT NULL,
  time_to_complete_hours numeric,
  reward_xp integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_quest_templates_type ON quest_templates(type) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_quest_templates_difficulty ON quest_templates(difficulty) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_quest_rotations_user_date ON user_quest_rotations(user_id, rotation_date, quest_type);
CREATE INDEX IF NOT EXISTS idx_user_quest_rotations_expires ON user_quest_rotations(expires_at) WHERE completed = false;
CREATE INDEX IF NOT EXISTS idx_quest_history_user ON quest_completion_history(user_id, completion_date DESC);

-- Enable Row Level Security
ALTER TABLE quest_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_quest_rotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quest_completion_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for quest_templates
CREATE POLICY "Quest templates are viewable by authenticated users"
  ON quest_templates
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- RLS Policies for user_quest_rotations
CREATE POLICY "Users can view own quest rotations"
  ON user_quest_rotations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quest rotations"
  ON user_quest_rotations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own quest rotations"
  ON user_quest_rotations
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for quest_completion_history
CREATE POLICY "Users can view own quest history"
  ON quest_completion_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quest history"
  ON quest_completion_history
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Insert comprehensive quest templates
INSERT INTO quest_templates (quest_key, title, description, type, category, difficulty, target_value, metric_type, reward_xp, reward_items, reward_powerups, icon_emoji, unlock_level) VALUES

-- DAILY QUESTS (15 total)

-- Easy Daily (3 quests)
('daily_focus_warrior', 'Daily Focus Warrior', 'Complete 3 focus sessions today', 'daily', 'sessions', 'easy', 3, 'sessions', 100, '[]'::jsonb, '["powerup_motivation_boost"]'::jsonb, '🎯', 0),
('daily_morning_ritual', 'Morning Ritual', 'Complete 1 focus session before noon', 'daily', 'special', 'easy', 1, 'morning_sessions', 80, '[]'::jsonb, '[]'::jsonb, '🌅', 0),
('daily_quick_starter', 'Quick Starter', 'Start any focus session today', 'daily', 'sessions', 'easy', 1, 'sessions', 50, '[]'::jsonb, '[]'::jsonb, '⚡', 0),

-- Medium Daily (5 quests)
('daily_distraction_master', 'Distraction Master', 'Complete a session with 0 distractions', 'daily', 'focus', 'medium', 1, 'perfect_sessions', 150, '["sound_binaural"]'::jsonb, '[]'::jsonb, '🧘', 0),
('daily_power_hour', 'Power Hour', 'Complete a 60-minute focus session', 'daily', 'endurance', 'medium', 1, 'long_sessions', 200, '[]'::jsonb, '["powerup_focus_enhancer"]'::jsonb, '⏱️', 0),
('daily_five_session', 'Five Session Challenge', 'Complete 5 focus sessions today', 'daily', 'sessions', 'medium', 5, 'sessions', 180, '[]'::jsonb, '[]'::jsonb, '🔥', 0),
('daily_low_distraction', 'Zen Focus', 'Complete 3 sessions with less than 2 distractions each', 'daily', 'focus', 'medium', 3, 'low_distraction_sessions', 160, '["sound_rain"]'::jsonb, '[]'::jsonb, '☯️', 5),
('daily_evening_grind', 'Evening Grind', 'Complete 2 sessions after 6 PM', 'daily', 'special', 'medium', 2, 'evening_sessions', 140, '[]'::jsonb, '[]'::jsonb, '🌙', 0),

-- Hard Daily (5 quests)
('daily_endurance_test', 'Endurance Test', 'Complete a Hard or Extreme focus session', 'daily', 'sessions', 'hard', 1, 'hard_sessions', 200, '[]'::jsonb, '["powerup_double_xp"]'::jsonb, '💪', 0),
('daily_perfect_trio', 'Perfect Trio', 'Complete 3 perfect sessions (0 distractions) today', 'daily', 'perfection', 'hard', 3, 'perfect_sessions', 300, '["theme_midnight"]'::jsonb, '["powerup_streak_shield"]'::jsonb, '✨', 10),
('daily_speed_demon', 'Speed Demon', 'Complete 4 sessions in under 6 hours', 'daily', 'speed', 'hard', 4, 'speed_sessions', 250, '[]'::jsonb, '["powerup_time_warp"]'::jsonb, '🚀', 8),
('daily_xp_hunter', 'XP Hunter', 'Earn 500 XP from sessions today', 'daily', 'xp', 'hard', 500, 'xp_earned', 220, '[]'::jsonb, '[]'::jsonb, '💎', 5),
('daily_marathon', 'Daily Marathon', 'Focus for 3 total hours today', 'daily', 'endurance', 'hard', 180, 'total_minutes', 280, '["sound_thunderstorm"]'::jsonb, '[]'::jsonb, '🏃‍♂️', 7),

-- Extreme Daily (2 quests)
('daily_iron_will', 'Iron Will', 'Complete 8 focus sessions today', 'daily', 'sessions', 'extreme', 8, 'sessions', 400, '["special_golden_timer"]'::jsonb, '["powerup_double_xp", "powerup_streak_shield"]'::jsonb, '🏆', 15),
('daily_perfectionist', 'The Perfectionist', 'Complete 5 perfect sessions with 90+ focus score', 'daily', 'perfection', 'extreme', 5, 'perfect_high_focus_sessions', 500, '["theme_aurora", "avatar_crown"]'::jsonb, '["powerup_ai_insights"]'::jsonb, '👑', 20),

-- WEEKLY QUESTS (12 total)

-- Easy Weekly (2 quests)
('weekly_consistency_starter', 'Consistency Starter', 'Focus at least once every day for 3 days', 'weekly', 'streaks', 'easy', 3, 'active_days', 250, '[]'::jsonb, '[]'::jsonb, '📅', 0),
('weekly_session_sampler', 'Session Sampler', 'Complete 7 focus sessions this week', 'weekly', 'sessions', 'easy', 7, 'sessions', 200, '["sound_ocean"]'::jsonb, '[]'::jsonb, '🎵', 0),

-- Medium Weekly (4 quests)
('weekly_focus_marathon', 'Focus Marathon', 'Complete 15 focus sessions this week', 'weekly', 'sessions', 'medium', 15, 'sessions', 400, '["theme_aurora", "sound_thunderstorm"]'::jsonb, '[]'::jsonb, '🏃‍♂️', 0),
('weekly_xp_collector', 'XP Collector', 'Earn 1000 XP this week', 'weekly', 'xp', 'medium', 1000, 'xp_earned', 300, '["avatar_crown"]'::jsonb, '["powerup_ai_insights"]'::jsonb, '💎', 0),
('weekly_focus_master', 'Focus Master', 'Achieve 90%+ focus score in 5 sessions', 'weekly', 'focus', 'medium', 5, 'high_focus_sessions', 350, '["special_zen_mode"]'::jsonb, '["powerup_focus_enhancer"]'::jsonb, '🧠', 0),
('weekly_variety_pack', 'Variety Pack', 'Complete sessions in all 4 difficulty levels', 'weekly', 'special', 'medium', 4, 'variety_sessions', 320, '["theme_midnight"]'::jsonb, '[]'::jsonb, '🎨', 5),

-- Hard Weekly (4 quests)
('weekly_consistency_champion', 'Consistency Champion', 'Maintain a 7-day focus streak', 'weekly', 'streaks', 'hard', 7, 'streak_days', 500, '["special_golden_timer"]'::jsonb, '["powerup_streak_shield"]'::jsonb, '🔥', 0),
('weekly_endurance_king', 'Endurance King', 'Complete 10 hours of focus this week', 'weekly', 'endurance', 'hard', 600, 'total_minutes', 600, '["theme_cosmic", "sound_forest"]'::jsonb, '["powerup_double_xp"]'::jsonb, '⏰', 10),
('weekly_perfect_week', 'Perfect Week', 'Complete 10 sessions with 0 distractions', 'weekly', 'perfection', 'hard', 10, 'perfect_sessions', 550, '["special_zen_mode"]'::jsonb, '["powerup_ai_insights"]'::jsonb, '✨', 12),
('weekly_hard_mode', 'Hard Mode Champion', 'Complete 8 Hard or Extreme sessions', 'weekly', 'sessions', 'hard', 8, 'hard_sessions', 480, '["avatar_legendary"]'::jsonb, '["powerup_focus_enhancer"]'::jsonb, '💪', 8),

-- Extreme Weekly (2 quests)
('weekly_iron_warrior', 'Iron Warrior', 'Complete 25 focus sessions this week', 'weekly', 'sessions', 'extreme', 25, 'sessions', 800, '["special_diamond_timer", "theme_galaxy"]'::jsonb, '["powerup_double_xp", "powerup_streak_shield"]'::jsonb, '⚔️', 15),
('weekly_legend', 'Weekly Legend', 'Complete 7 perfect days (3+ sessions, 0 distractions each)', 'weekly', 'perfection', 'extreme', 7, 'perfect_days', 1000, '["special_legendary_badge", "theme_divine", "avatar_ultimate"]'::jsonb, '["powerup_ai_insights", "powerup_double_xp"]'::jsonb, '👑', 25);
