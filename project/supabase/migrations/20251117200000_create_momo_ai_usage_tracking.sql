/*
  # Create MoMo AI Usage Tracking Table

  ## Summary
  Creates a table to track daily AI message usage for rate limiting and analytics.

  ## New Tables

  ### `momo_ai_usage`
  Tracks daily message counts per user for rate limiting.
  - `id` (uuid, primary key) - Unique record identifier
  - `user_id` (uuid, foreign key) - References auth.users
  - `date` (date) - Date of usage (YYYY-MM-DD)
  - `message_count` (integer) - Number of messages sent that day
  - `created_at` (timestamptz) - Record creation time
  - `updated_at` (timestamptz) - Last update time

  ## Security
  - RLS enabled with user-specific access policies
  - Users can only view and update their own usage records

  ## Indexes
  - Unique constraint on (user_id, date) to prevent duplicates
  - Index on user_id and date for fast lookups
*/

-- Create momo_ai_usage table
CREATE TABLE IF NOT EXISTS momo_ai_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  message_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(user_id, date)
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_momo_ai_usage_user_date ON momo_ai_usage(user_id, date);

-- Enable Row Level Security
ALTER TABLE momo_ai_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for momo_ai_usage
CREATE POLICY "Users can view own usage"
  ON momo_ai_usage FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage"
  ON momo_ai_usage FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own usage"
  ON momo_ai_usage FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to handle upsert on conflict
CREATE OR REPLACE FUNCTION increment_ai_usage(p_user_id uuid, p_date date)
RETURNS void AS $$
BEGIN
  INSERT INTO momo_ai_usage (user_id, date, message_count)
  VALUES (p_user_id, p_date, 1)
  ON CONFLICT (user_id, date)
  DO UPDATE SET
    message_count = momo_ai_usage.message_count + 1,
    updated_at = now();
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER update_momo_ai_usage_updated_at
  BEFORE UPDATE ON momo_ai_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
