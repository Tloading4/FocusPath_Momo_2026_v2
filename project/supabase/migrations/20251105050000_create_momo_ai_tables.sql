/*
  # Create MoMo AI Database Schema

  ## Summary
  This migration creates the database structure for MoMo AI, an enhanced productivity coaching assistant powered by Poe API.

  ## New Tables

  ### 1. `momo_conversations`
  Stores user conversation sessions with MoMo AI.
  - `id` (uuid, primary key) - Unique conversation identifier
  - `user_id` (uuid, foreign key) - References auth.users
  - `title` (text) - Auto-generated conversation title
  - `personality_mode` (text) - Selected AI personality (coach, mentor, buddy)
  - `is_active` (boolean) - Whether conversation is currently active
  - `last_message_at` (timestamptz) - Timestamp of last message
  - `created_at` (timestamptz) - Conversation creation time
  - `updated_at` (timestamptz) - Last update time
  - `metadata` (jsonb) - Additional context (session_id, tags, etc.)

  ### 2. `momo_messages`
  Stores individual chat messages within conversations.
  - `id` (uuid, primary key) - Unique message identifier
  - `conversation_id` (uuid, foreign key) - References momo_conversations
  - `user_id` (uuid, foreign key) - References auth.users
  - `role` (text) - Message role (user, assistant, system)
  - `content` (text) - Message content
  - `context_data` (jsonb) - Focus score, session progress, distractions, etc.
  - `tokens_used` (integer) - API tokens consumed
  - `created_at` (timestamptz) - Message timestamp

  ### 3. `momo_ai_preferences`
  Stores user preferences for MoMo AI interactions.
  - `user_id` (uuid, primary key, foreign key) - References auth.users
  - `default_personality` (text) - Default coaching personality
  - `proactive_coaching` (boolean) - Enable proactive interventions
  - `notification_preferences` (jsonb) - When to notify user
  - `coaching_focus_areas` (text[]) - Areas to focus on (productivity, habits, focus)
  - `language_style` (text) - Formal, casual, motivational
  - `created_at` (timestamptz) - Preference creation time
  - `updated_at` (timestamptz) - Last update time

  ### 4. `momo_insights`
  Stores AI-generated insights and recommendations.
  - `id` (uuid, primary key) - Unique insight identifier
  - `user_id` (uuid, foreign key) - References auth.users
  - `insight_type` (text) - Type (pattern, recommendation, achievement, alert)
  - `title` (text) - Insight title
  - `description` (text) - Detailed insight description
  - `priority` (text) - low, medium, high
  - `is_read` (boolean) - Whether user has viewed it
  - `action_items` (jsonb) - Suggested actions
  - `related_data` (jsonb) - Supporting data and metrics
  - `generated_at` (timestamptz) - When insight was generated
  - `expires_at` (timestamptz) - Optional expiration date
  - `created_at` (timestamptz) - Record creation time

  ## Security

  All tables have Row Level Security (RLS) enabled with policies ensuring:
  - Users can only access their own data
  - All operations require authentication
  - Proper ownership checks on all CRUD operations

  ## Indexes

  Performance indexes on:
  - Foreign keys for fast joins
  - Timestamp fields for sorting
  - Conversation active status for quick filtering
  - User lookups
*/

-- Create momo_conversations table
CREATE TABLE IF NOT EXISTS momo_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'New Conversation',
  personality_mode text NOT NULL DEFAULT 'coach',
  is_active boolean DEFAULT true,
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,

  CONSTRAINT valid_personality CHECK (personality_mode IN ('coach', 'mentor', 'buddy', 'motivator'))
);

-- Create momo_messages table
CREATE TABLE IF NOT EXISTS momo_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES momo_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  context_data jsonb DEFAULT '{}'::jsonb,
  tokens_used integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),

  CONSTRAINT valid_role CHECK (role IN ('user', 'assistant', 'system'))
);

-- Create momo_ai_preferences table
CREATE TABLE IF NOT EXISTS momo_ai_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  default_personality text DEFAULT 'coach',
  proactive_coaching boolean DEFAULT true,
  notification_preferences jsonb DEFAULT '{"check_ins": true, "insights": true, "celebrations": true}'::jsonb,
  coaching_focus_areas text[] DEFAULT ARRAY['productivity', 'focus', 'habits'],
  language_style text DEFAULT 'motivational',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  CONSTRAINT valid_default_personality CHECK (default_personality IN ('coach', 'mentor', 'buddy', 'motivator')),
  CONSTRAINT valid_language_style CHECK (language_style IN ('formal', 'casual', 'motivational'))
);

-- Create momo_insights table
CREATE TABLE IF NOT EXISTS momo_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  insight_type text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  priority text DEFAULT 'medium',
  is_read boolean DEFAULT false,
  action_items jsonb DEFAULT '[]'::jsonb,
  related_data jsonb DEFAULT '{}'::jsonb,
  generated_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),

  CONSTRAINT valid_insight_type CHECK (insight_type IN ('pattern', 'recommendation', 'achievement', 'alert')),
  CONSTRAINT valid_priority CHECK (priority IN ('low', 'medium', 'high'))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_momo_conversations_user_id ON momo_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_momo_conversations_active ON momo_conversations(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_momo_conversations_last_message ON momo_conversations(user_id, last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_momo_messages_conversation_id ON momo_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_momo_messages_user_id ON momo_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_momo_messages_created_at ON momo_messages(conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_momo_insights_user_id ON momo_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_momo_insights_unread ON momo_insights(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_momo_insights_generated_at ON momo_insights(user_id, generated_at DESC);

-- Enable Row Level Security
ALTER TABLE momo_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE momo_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE momo_ai_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE momo_insights ENABLE ROW LEVEL SECURITY;

-- RLS Policies for momo_conversations
CREATE POLICY "Users can view own conversations"
  ON momo_conversations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own conversations"
  ON momo_conversations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations"
  ON momo_conversations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations"
  ON momo_conversations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for momo_messages
CREATE POLICY "Users can view own messages"
  ON momo_messages FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own messages"
  ON momo_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own messages"
  ON momo_messages FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for momo_ai_preferences
CREATE POLICY "Users can view own preferences"
  ON momo_ai_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON momo_ai_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON momo_ai_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for momo_insights
CREATE POLICY "Users can view own insights"
  ON momo_insights FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own insights"
  ON momo_insights FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own insights"
  ON momo_insights FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_momo_conversations_updated_at
  BEFORE UPDATE ON momo_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_momo_ai_preferences_updated_at
  BEFORE UPDATE ON momo_ai_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
