/*
  # Fix Remaining Security and Performance Issues

  This migration addresses additional security and performance issues:

  ## 1. Add Missing Indexes on Foreign Keys
  - Add index on `focus_mode_sessions.subject_id`
  - Add index on `focus_mode_sessions.work_category_id`
  - Add index on `focus_sessions.user_id`
  - Add index on `momo_messages.conversation_id`
  - Add index on `quest_completion_history.user_id`

  ## 2. Fix Security Definer View
  - Properly recreate `session_quality_summary` view as SECURITY INVOKER

  ## Note on "Unused Indexes"
  The indexes created in the previous migration (idx_distractions_session_id, etc.) 
  are retained as they are essential for foreign key query performance. They will 
  be utilized as the application runs queries against these tables.
*/

-- =====================================================
-- 1. ADD MISSING INDEXES ON FOREIGN KEYS
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_focus_mode_sessions_subject_id 
  ON public.focus_mode_sessions(subject_id);

CREATE INDEX IF NOT EXISTS idx_focus_mode_sessions_work_category_id 
  ON public.focus_mode_sessions(work_category_id);

CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_id 
  ON public.focus_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_momo_messages_conversation_id 
  ON public.momo_messages(conversation_id);

CREATE INDEX IF NOT EXISTS idx_quest_completion_history_user_id 
  ON public.quest_completion_history(user_id);

-- =====================================================
-- 2. FIX SECURITY DEFINER VIEW
-- =====================================================

-- Drop and recreate the view explicitly as SECURITY INVOKER
DROP VIEW IF EXISTS public.session_quality_summary CASCADE;

CREATE VIEW public.session_quality_summary 
WITH (security_invoker = true) AS
SELECT 
  user_id,
  COUNT(*) as total_sessions,
  AVG(focus_score) as avg_quality_score,
  SUM(CASE WHEN focus_score >= 80 THEN 1 ELSE 0 END) as high_quality_sessions
FROM public.focus_sessions
WHERE completed = true
GROUP BY user_id;
