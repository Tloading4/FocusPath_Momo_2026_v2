-- # Fix Database Security and Performance

-- Add missing foreign key indexes
CREATE INDEX IF NOT EXISTS idx_focus_mode_sessions_subject_id ON focus_mode_sessions(subject_id);
CREATE INDEX IF NOT EXISTS idx_focus_mode_sessions_work_category_id ON focus_mode_sessions(work_category_id);

-- Remove unused indexes
DROP INDEX IF EXISTS idx_custom_avatars_is_active;
DROP INDEX IF EXISTS idx_focus_mode_sessions_user_id;
DROP INDEX IF EXISTS idx_focus_mode_sessions_mode_type;
DROP INDEX IF EXISTS idx_focus_mode_sessions_created_at;
DROP INDEX IF EXISTS idx_school_subjects_category;
DROP INDEX IF EXISTS idx_work_categories_type;
DROP INDEX IF EXISTS idx_sync_status_user_entity;
DROP INDEX IF EXISTS idx_user_profiles_preferences;
DROP INDEX IF EXISTS idx_distractions_session_id;
DROP INDEX IF EXISTS idx_distractions_user_id;
DROP INDEX IF EXISTS idx_achievements_user_id;
DROP INDEX IF EXISTS idx_focus_sessions_user_id;
DROP INDEX IF EXISTS idx_focus_sessions_start_time;
DROP INDEX IF EXISTS idx_focus_sessions_user_time;
DROP INDEX IF EXISTS idx_minigame_sessions_user_id;
DROP INDEX IF EXISTS idx_minigame_sessions_start_time;
DROP INDEX IF EXISTS idx_minigame_sessions_validated;
DROP INDEX IF EXISTS idx_minigame_rate_limits_user_id;
DROP INDEX IF EXISTS idx_minigame_rate_limits_reset_date;

-- Fix function search path
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Fix RLS policies (optimized with select auth.uid())
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT TO authenticated USING (id = (select auth.uid()));
CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT TO authenticated WITH CHECK (id = (select auth.uid()));
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE TO authenticated USING (id = (select auth.uid())) WITH CHECK (id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own sessions" ON focus_sessions;
DROP POLICY IF EXISTS "Users can create own sessions" ON focus_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON focus_sessions;
DROP POLICY IF EXISTS "Users can delete own sessions" ON focus_sessions;
CREATE POLICY "Users can view own sessions" ON focus_sessions FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
CREATE POLICY "Users can create own sessions" ON focus_sessions FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "Users can update own sessions" ON focus_sessions FOR UPDATE TO authenticated USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "Users can delete own sessions" ON focus_sessions FOR DELETE TO authenticated USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own distractions" ON distractions;
DROP POLICY IF EXISTS "Users can create own distractions" ON distractions;
CREATE POLICY "Users can view own distractions" ON distractions FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
CREATE POLICY "Users can create own distractions" ON distractions FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own achievements" ON achievements;
DROP POLICY IF EXISTS "Users can create own achievements" ON achievements;
CREATE POLICY "Users can view own achievements" ON achievements FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
CREATE POLICY "Users can create own achievements" ON achievements FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own sync status" ON sync_status;
DROP POLICY IF EXISTS "Users can manage own sync status" ON sync_status;
DROP POLICY IF EXISTS "Users can update own sync status" ON sync_status;
CREATE POLICY "Users can view own sync status" ON sync_status FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
CREATE POLICY "Users can manage own sync status" ON sync_status FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "Users can update own sync status" ON sync_status FOR UPDATE TO authenticated USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own minigame sessions" ON minigame_sessions;
DROP POLICY IF EXISTS "Users can insert own minigame sessions" ON minigame_sessions;
DROP POLICY IF EXISTS "Users can update own minigame sessions" ON minigame_sessions;
CREATE POLICY "Users can view own minigame sessions" ON minigame_sessions FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
CREATE POLICY "Users can insert own minigame sessions" ON minigame_sessions FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "Users can update own minigame sessions" ON minigame_sessions FOR UPDATE TO authenticated USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own rate limits" ON minigame_rate_limits;
DROP POLICY IF EXISTS "Users can insert own rate limits" ON minigame_rate_limits;
DROP POLICY IF EXISTS "Users can update own rate limits" ON minigame_rate_limits;
CREATE POLICY "Users can view own rate limits" ON minigame_rate_limits FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
CREATE POLICY "Users can insert own rate limits" ON minigame_rate_limits FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "Users can update own rate limits" ON minigame_rate_limits FOR UPDATE TO authenticated USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));

-- focus_mode_sessions has TEXT user_id, needs cast
DROP POLICY IF EXISTS "Users can view own focus mode sessions" ON focus_mode_sessions;
DROP POLICY IF EXISTS "Users can insert own focus mode sessions" ON focus_mode_sessions;
DROP POLICY IF EXISTS "Users can update own focus mode sessions" ON focus_mode_sessions;
DROP POLICY IF EXISTS "Users can delete own focus mode sessions" ON focus_mode_sessions;
CREATE POLICY "Users can view own focus mode sessions" ON focus_mode_sessions FOR SELECT TO authenticated USING (user_id::uuid = (select auth.uid()));
CREATE POLICY "Users can insert own focus mode sessions" ON focus_mode_sessions FOR INSERT TO authenticated WITH CHECK (user_id::uuid = (select auth.uid()));
CREATE POLICY "Users can update own focus mode sessions" ON focus_mode_sessions FOR UPDATE TO authenticated USING (user_id::uuid = (select auth.uid())) WITH CHECK (user_id::uuid = (select auth.uid()));
CREATE POLICY "Users can delete own focus mode sessions" ON focus_mode_sessions FOR DELETE TO authenticated USING (user_id::uuid = (select auth.uid()));

-- Stripe tables (using customer_id lookup)
DROP POLICY IF EXISTS "Users can view their own customer data" ON stripe_customers;
CREATE POLICY "Users can view their own customer data" ON stripe_customers FOR SELECT TO authenticated USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view their own subscription data" ON stripe_subscriptions;
CREATE POLICY "Users can view their own subscription data" ON stripe_subscriptions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM stripe_customers sc WHERE sc.customer_id = stripe_subscriptions.customer_id AND sc.user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Users can view their own order data" ON stripe_orders;
CREATE POLICY "Users can view their own order data" ON stripe_orders FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM stripe_customers sc WHERE sc.customer_id = stripe_orders.customer_id AND sc.user_id = (select auth.uid())));