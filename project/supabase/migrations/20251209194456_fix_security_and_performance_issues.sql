/*
  # Fix Security and Performance Issues

  This migration addresses multiple security and performance issues identified in the database audit:

  ## 1. Add Missing Indexes on Foreign Keys
  - Add index on `distractions.session_id`
  - Add index on `distractions.user_id`
  - Add index on `minigame_sessions.user_id`
  - Add index on `user_quest_rotations.quest_template_id`

  ## 2. Optimize RLS Policies (Auth Function Caching)
  - Fix `user_quest_rotations` policies to use `(select auth.uid())`
  - Fix `quest_completion_history` policies to use `(select auth.uid())`

  ## 3. Remove Unused Indexes
  - Drop 28 unused indexes across various tables to improve write performance

  ## 4. Fix Multiple Permissive Policies
  - Remove duplicate SELECT policy on `streak_milestones`

  ## 5. Fix Security Definer View
  - Recreate `session_quality_summary` view without SECURITY DEFINER

  ## 6. Fix Function Search Paths
  - Set immutable search_path for 12 functions

  ## 7. Enable RLS on Public Tables
  - Enable RLS on `user_profiles` table (CRITICAL SECURITY FIX)
*/

-- =====================================================
-- 1. ADD MISSING INDEXES ON FOREIGN KEYS
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_distractions_session_id ON public.distractions(session_id);
CREATE INDEX IF NOT EXISTS idx_distractions_user_id ON public.distractions(user_id);
CREATE INDEX IF NOT EXISTS idx_minigame_sessions_user_id ON public.minigame_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_quest_rotations_quest_template_id ON public.user_quest_rotations(quest_template_id);

-- =====================================================
-- 2. OPTIMIZE RLS POLICIES (AUTH FUNCTION CACHING)
-- =====================================================

-- Fix user_quest_rotations policies
DROP POLICY IF EXISTS "Users can view own quest rotations" ON public.user_quest_rotations;
DROP POLICY IF EXISTS "Users can insert own quest rotations" ON public.user_quest_rotations;
DROP POLICY IF EXISTS "Users can update own quest rotations" ON public.user_quest_rotations;

CREATE POLICY "Users can view own quest rotations"
  ON public.user_quest_rotations
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own quest rotations"
  ON public.user_quest_rotations
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own quest rotations"
  ON public.user_quest_rotations
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- Fix quest_completion_history policies
DROP POLICY IF EXISTS "Users can view own quest history" ON public.quest_completion_history;
DROP POLICY IF EXISTS "Users can insert own quest history" ON public.quest_completion_history;

CREATE POLICY "Users can view own quest history"
  ON public.quest_completion_history
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own quest history"
  ON public.quest_completion_history
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- =====================================================
-- 3. REMOVE UNUSED INDEXES
-- =====================================================

DROP INDEX IF EXISTS public.idx_focus_sessions_end_reason;
DROP INDEX IF EXISTS public.idx_focus_sessions_completed_end_reason;
DROP INDEX IF EXISTS public.idx_focus_sessions_distraction_analysis;
DROP INDEX IF EXISTS public.idx_focus_sessions_timeout;
DROP INDEX IF EXISTS public.idx_momo_conversations_user_id;
DROP INDEX IF EXISTS public.idx_momo_conversations_active;
DROP INDEX IF EXISTS public.idx_momo_conversations_last_message;
DROP INDEX IF EXISTS public.idx_momo_messages_conversation_id;
DROP INDEX IF EXISTS public.idx_momo_messages_created_at;
DROP INDEX IF EXISTS public.idx_momo_messages_user_id;
DROP INDEX IF EXISTS public.idx_xp_rotations_date;
DROP INDEX IF EXISTS public.idx_focus_mode_sessions_subject_id;
DROP INDEX IF EXISTS public.idx_focus_mode_sessions_work_category_id;
DROP INDEX IF EXISTS public.idx_momo_insights_user_id;
DROP INDEX IF EXISTS public.idx_momo_insights_unread;
DROP INDEX IF EXISTS public.idx_momo_insights_generated_at;
DROP INDEX IF EXISTS public.idx_quest_templates_difficulty;
DROP INDEX IF EXISTS public.idx_user_quest_rotations_user_date;
DROP INDEX IF EXISTS public.idx_user_quest_rotations_expires;
DROP INDEX IF EXISTS public.idx_quest_templates_type;
DROP INDEX IF EXISTS public.idx_quest_history_user;
DROP INDEX IF EXISTS public.idx_momo_ai_usage_user_date;
DROP INDEX IF EXISTS public.idx_user_profiles_preferences_widget_layout;
DROP INDEX IF EXISTS public.idx_streak_milestones_user_id;
DROP INDEX IF EXISTS public.idx_streak_milestones_milestone_days;
DROP INDEX IF EXISTS public.idx_streak_milestones_achieved_at;
DROP INDEX IF EXISTS public.idx_user_profiles_username_needs_update;
DROP INDEX IF EXISTS public.idx_user_profiles_last_username_change;

-- =====================================================
-- 4. FIX MULTIPLE PERMISSIVE POLICIES
-- =====================================================

-- Remove duplicate policy on streak_milestones
DROP POLICY IF EXISTS "Public users can read own streak milestones" ON public.streak_milestones;

-- =====================================================
-- 5. FIX SECURITY DEFINER VIEW
-- =====================================================

-- Recreate session_quality_summary view without SECURITY DEFINER
DROP VIEW IF EXISTS public.session_quality_summary;

CREATE VIEW public.session_quality_summary AS
SELECT 
  user_id,
  COUNT(*) as total_sessions,
  AVG(focus_score) as avg_quality_score,
  SUM(CASE WHEN focus_score >= 80 THEN 1 ELSE 0 END) as high_quality_sessions
FROM public.focus_sessions
WHERE completed = true
GROUP BY user_id;

-- =====================================================
-- 6. FIX FUNCTION SEARCH PATHS
-- =====================================================

-- Fix get_rotation_for_date (target_date date)
ALTER FUNCTION public.get_rotation_for_date(target_date date) SET search_path = public, pg_temp;

-- Fix calculate_focus_quality (with correct signature)
ALTER FUNCTION public.calculate_focus_quality(
  p_completed boolean,
  p_completion_percentage integer,
  p_distraction_count integer,
  p_pause_count integer,
  p_timeout_penalty boolean,
  p_time_to_end integer
) SET search_path = public, pg_temp;

-- Fix ensure_rotation_for_date (target_date date)
ALTER FUNCTION public.ensure_rotation_for_date(target_date date) SET search_path = public, pg_temp;

-- Fix initialize_widget_layout (no args)
ALTER FUNCTION public.initialize_widget_layout() SET search_path = public, pg_temp;

-- Fix update_updated_at_column (no args)
ALTER FUNCTION public.update_updated_at_column() SET search_path = public, pg_temp;

-- Fix add_default_layout_presets (no args)
ALTER FUNCTION public.add_default_layout_presets() SET search_path = public, pg_temp;

-- Fix validate_widget_layout (no args - it's a trigger)
ALTER FUNCTION public.validate_widget_layout() SET search_path = public, pg_temp;

-- Fix get_duplicate_usernames (no args)
ALTER FUNCTION public.get_duplicate_usernames() SET search_path = public, pg_temp;

-- Fix validate_username_format (username text)
ALTER FUNCTION public.validate_username_format(username text) SET search_path = public, pg_temp;

-- Fix check_username_available (username text, exclude_user_id uuid)
ALTER FUNCTION public.check_username_available(username text, exclude_user_id uuid) SET search_path = public, pg_temp;

-- Fix suggest_usernames (base_username text, limit_count integer)
ALTER FUNCTION public.suggest_usernames(base_username text, limit_count integer) SET search_path = public, pg_temp;

-- Fix handle_duplicate_usernames (no args)
ALTER FUNCTION public.handle_duplicate_usernames() SET search_path = public, pg_temp;

-- =====================================================
-- 7. ENABLE RLS ON PUBLIC TABLES (CRITICAL)
-- =====================================================

-- Enable RLS on user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for user_profiles (using 'id' column, not 'user_id')
DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;

CREATE POLICY "Users can read own profile"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (id = (select auth.uid()));

CREATE POLICY "Users can update own profile"
  ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

CREATE POLICY "Users can insert own profile"
  ON public.user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = (select auth.uid()));
