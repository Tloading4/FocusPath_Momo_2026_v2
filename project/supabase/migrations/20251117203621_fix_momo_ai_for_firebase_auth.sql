/*
  # Fix MoMo AI Tables for Firebase Authentication
  
  ## Summary
  This migration modifies the MoMo AI tables to work with Firebase authentication
  by changing user_id columns from UUID to TEXT type.
  
  ## Changes
  1. Drop all RLS policies that depend on user_id columns
  2. Drop existing foreign key constraints
  3. Modify user_id columns to TEXT type
  4. Create momo_ai_usage table
  5. Recreate RLS policies for Firebase auth
  
  ## Security
  RLS policies allow authenticated users to access data, with user_id filtering
  enforced at the application layer
*/

-- Step 1: Drop all existing RLS policies
DROP POLICY IF EXISTS "Users can view own conversations" ON momo_conversations;
DROP POLICY IF EXISTS "Users can create own conversations" ON momo_conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON momo_conversations;
DROP POLICY IF EXISTS "Users can delete own conversations" ON momo_conversations;

DROP POLICY IF EXISTS "Users can view own messages" ON momo_messages;
DROP POLICY IF EXISTS "Users can create own messages" ON momo_messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON momo_messages;

DROP POLICY IF EXISTS "Users can view own preferences" ON momo_ai_preferences;
DROP POLICY IF EXISTS "Users can insert own preferences" ON momo_ai_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON momo_ai_preferences;

DROP POLICY IF EXISTS "Users can view own insights" ON momo_insights;
DROP POLICY IF EXISTS "Users can update own insights" ON momo_insights;
DROP POLICY IF EXISTS "Users can delete own insights" ON momo_insights;

-- Step 2: Drop foreign key constraints
ALTER TABLE IF EXISTS momo_conversations 
  DROP CONSTRAINT IF EXISTS momo_conversations_user_id_fkey;

ALTER TABLE IF EXISTS momo_messages 
  DROP CONSTRAINT IF EXISTS momo_messages_user_id_fkey;

ALTER TABLE IF EXISTS momo_ai_preferences 
  DROP CONSTRAINT IF EXISTS momo_ai_preferences_user_id_fkey;

ALTER TABLE IF EXISTS momo_insights 
  DROP CONSTRAINT IF EXISTS momo_insights_user_id_fkey;

-- Step 3: Modify user_id columns to TEXT
ALTER TABLE momo_conversations 
  ALTER COLUMN user_id TYPE text USING user_id::text;

ALTER TABLE momo_messages 
  ALTER COLUMN user_id TYPE text USING user_id::text;

ALTER TABLE momo_ai_preferences 
  ALTER COLUMN user_id TYPE text USING user_id::text;

ALTER TABLE momo_insights 
  ALTER COLUMN user_id TYPE text USING user_id::text;

-- Step 4: Create momo_ai_usage table with TEXT user_id
CREATE TABLE IF NOT EXISTS momo_ai_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  date date NOT NULL,
  message_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_momo_ai_usage_user_date ON momo_ai_usage(user_id, date);

ALTER TABLE momo_ai_usage ENABLE ROW LEVEL SECURITY;

-- Step 5: Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for momo_ai_usage
DROP TRIGGER IF EXISTS update_momo_ai_usage_updated_at ON momo_ai_usage;
CREATE TRIGGER update_momo_ai_usage_updated_at
  BEFORE UPDATE ON momo_ai_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Step 6: Recreate RLS policies for all tables
-- These policies allow all authenticated users to access data
-- User filtering is enforced at the application layer

CREATE POLICY "Authenticated users can view conversations"
  ON momo_conversations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create conversations"
  ON momo_conversations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update conversations"
  ON momo_conversations FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete conversations"
  ON momo_conversations FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view messages"
  ON momo_messages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create messages"
  ON momo_messages FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete messages"
  ON momo_messages FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view preferences"
  ON momo_ai_preferences FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert preferences"
  ON momo_ai_preferences FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update preferences"
  ON momo_ai_preferences FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view insights"
  ON momo_insights FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update insights"
  ON momo_insights FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete insights"
  ON momo_insights FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view usage"
  ON momo_ai_usage FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert usage"
  ON momo_ai_usage FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update usage"
  ON momo_ai_usage FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
