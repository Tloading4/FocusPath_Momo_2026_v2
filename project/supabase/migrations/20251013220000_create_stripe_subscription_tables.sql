/*
  # Stripe Subscription Management Schema

  ## Overview
  This migration creates tables for managing Stripe subscriptions and customer data.
  It integrates with the existing user_profiles table and provides complete subscription
  lifecycle management.

  ## New Tables Created

  ### 1. stripe_customers
  Maps Supabase user IDs to Stripe customer IDs for seamless integration
  - `id` (uuid, primary key) - Unique record ID
  - `user_id` (uuid, foreign key) - Reference to user_profiles
  - `stripe_customer_id` (text, unique) - Stripe customer ID
  - `email` (text) - Customer email from Stripe
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 2. subscriptions
  Stores active and historical subscription data synced from Stripe
  - `id` (uuid, primary key) - Unique subscription record ID
  - `user_id` (uuid, foreign key) - Reference to user_profiles
  - `stripe_subscription_id` (text, unique) - Stripe subscription ID
  - `stripe_customer_id` (text) - Stripe customer ID
  - `stripe_price_id` (text) - Stripe price ID for the plan
  - `status` (text) - Subscription status (active, canceled, past_due, etc.)
  - `tier` (text) - Subscription tier (standard, premium)
  - `interval` (text) - Billing interval (month, year)
  - `current_period_start` (timestamptz) - Current billing period start
  - `current_period_end` (timestamptz) - Current billing period end
  - `cancel_at_period_end` (boolean) - Whether subscription will cancel at period end
  - `canceled_at` (timestamptz) - When subscription was canceled
  - `trial_start` (timestamptz) - Trial period start
  - `trial_end` (timestamptz) - Trial period end
  - `metadata` (jsonb) - Additional subscription metadata from Stripe
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 3. subscription_events
  Logs all Stripe webhook events for audit trail and debugging
  - `id` (uuid, primary key) - Unique event record ID
  - `user_id` (uuid, foreign key) - Reference to user_profiles (nullable)
  - `stripe_event_id` (text, unique) - Stripe event ID
  - `event_type` (text) - Type of Stripe event
  - `subscription_id` (uuid) - Reference to subscriptions (nullable)
  - `stripe_subscription_id` (text) - Stripe subscription ID from event
  - `event_data` (jsonb) - Complete event payload from Stripe
  - `processed` (boolean) - Whether event was successfully processed
  - `error_message` (text) - Error message if processing failed
  - `created_at` (timestamptz) - Event receipt timestamp

  ## Security
  - Row Level Security (RLS) enabled on all tables
  - Users can only access their own subscription data
  - Policies for SELECT, INSERT, UPDATE operations
  - Webhook handler uses service role for write access
  - Authentication required for all user-facing operations

  ## Indexes
  - Performance indexes on user_id for fast lookups
  - Unique indexes on Stripe IDs to prevent duplicates
  - Index on subscription status for filtering active subscriptions

  ## Important Notes
  - Subscription status values match Stripe's status values
  - The tier field is derived from Stripe price metadata
  - All timestamps use timestamptz for timezone awareness
  - Events table provides complete audit trail of all Stripe interactions
*/

-- Create stripe_customers table
CREATE TABLE IF NOT EXISTS stripe_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  stripe_customer_id text UNIQUE NOT NULL,
  email text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  stripe_subscription_id text UNIQUE NOT NULL,
  stripe_customer_id text NOT NULL,
  stripe_price_id text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  tier text NOT NULL DEFAULT 'standard',
  interval text NOT NULL DEFAULT 'month',
  current_period_start timestamptz NOT NULL,
  current_period_end timestamptz NOT NULL,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  canceled_at timestamptz,
  trial_start timestamptz,
  trial_end timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create subscription_events table for webhook logging
CREATE TABLE IF NOT EXISTS subscription_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  stripe_event_id text UNIQUE NOT NULL,
  event_type text NOT NULL,
  subscription_id uuid REFERENCES subscriptions(id) ON DELETE SET NULL,
  stripe_subscription_id text,
  event_data jsonb NOT NULL,
  processed boolean NOT NULL DEFAULT false,
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_stripe_customers_user_id ON stripe_customers(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_customers_stripe_id ON stripe_customers(stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON subscriptions(user_id, status);

CREATE INDEX IF NOT EXISTS idx_subscription_events_user_id ON subscription_events(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_stripe_event_id ON subscription_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_created_at ON subscription_events(created_at DESC);

-- Enable Row Level Security
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stripe_customers
CREATE POLICY "Users can view own Stripe customer data"
  ON stripe_customers FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own Stripe customer data"
  ON stripe_customers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own Stripe customer data"
  ON stripe_customers FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for subscriptions
CREATE POLICY "Users can view own subscriptions"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions"
  ON subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions"
  ON subscriptions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for subscription_events
CREATE POLICY "Users can view own subscription events"
  ON subscription_events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_stripe_customers_updated_at ON stripe_customers;
CREATE TRIGGER update_stripe_customers_updated_at
  BEFORE UPDATE ON stripe_customers
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_updated_at();

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_updated_at();

-- Create helper function to get active subscription for a user
CREATE OR REPLACE FUNCTION get_active_subscription(p_user_id uuid)
RETURNS TABLE (
  subscription_id uuid,
  stripe_subscription_id text,
  tier text,
  status text,
  interval text,
  current_period_end timestamptz,
  cancel_at_period_end boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.stripe_subscription_id,
    s.tier,
    s.status,
    s.interval,
    s.current_period_end,
    s.cancel_at_period_end
  FROM subscriptions s
  WHERE s.user_id = p_user_id
    AND s.status IN ('active', 'trialing')
  ORDER BY s.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
