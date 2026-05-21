-- # Create Minigame Security and Rate Limiting Tables
--
-- 1. New Tables
--    - minigame_sessions: Track all minigame play sessions with validation
--    - minigame_rate_limits: Enforce daily limits and cooldowns per user
--
-- 2. Security
--    - Enable RLS on both tables
--    - Users can read their own records only
--    - Server-side validation controls XP awards
--
-- 3. Indexes
--    - Performance indexes on user_id and timestamps

-- Create minigame_sessions table
CREATE TABLE IF NOT EXISTS minigame_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  game_type text NOT NULL CHECK (game_type IN ('focus-puzzle', 'quick-math')),
  session_token text NOT NULL,
  start_time timestamptz NOT NULL DEFAULT now(),
  end_time timestamptz,
  duration_seconds integer,
  score integer DEFAULT 0,
  xp_awarded integer DEFAULT 0,
  completed boolean DEFAULT false,
  validated boolean DEFAULT false,
  validation_notes text,
  ip_address text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create minigame_rate_limits table
CREATE TABLE IF NOT EXISTS minigame_rate_limits (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_count integer DEFAULT 0,
  last_played_at timestamptz,
  daily_xp_earned integer DEFAULT 0,
  reset_date date DEFAULT CURRENT_DATE,
  total_minigames_played integer DEFAULT 0,
  suspicious_activity_count integer DEFAULT 0,
  is_banned boolean DEFAULT false,
  ban_until timestamptz,
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE minigame_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE minigame_rate_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for minigame_sessions
CREATE POLICY "Users can view own minigame sessions"
  ON minigame_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own minigame sessions"
  ON minigame_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own minigame sessions"
  ON minigame_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for minigame_rate_limits
CREATE POLICY "Users can view own rate limits"
  ON minigame_rate_limits FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own rate limits"
  ON minigame_rate_limits FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own rate limits"
  ON minigame_rate_limits FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_minigame_sessions_user_id ON minigame_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_minigame_sessions_start_time ON minigame_sessions(start_time);
CREATE INDEX IF NOT EXISTS idx_minigame_sessions_validated ON minigame_sessions(validated);
CREATE INDEX IF NOT EXISTS idx_minigame_rate_limits_user_id ON minigame_rate_limits(user_id);
CREATE INDEX IF NOT EXISTS idx_minigame_rate_limits_reset_date ON minigame_rate_limits(reset_date);