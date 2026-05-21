/*
  # Create Focus Modes Tables for Focus Path Precision

  1. New Tables
    - `school_subjects`
      - `id` (uuid, primary key)
      - `name` (text) - Subject name
      - `category` (text) - STEM, Humanities, Languages, Arts, Other
      - `display_order` (integer) - Order for display in UI
      - `is_active` (boolean) - Whether subject is available for selection
    
    - `work_categories`
      - `id` (uuid, primary key)
      - `name` (text) - Category name
      - `category_type` (text) - Creative, Administrative, Technical, Strategic, Collaborative
      - `display_order` (integer) - Order for display in UI
      - `is_active` (boolean) - Whether category is available for selection
    
    - `focus_mode_sessions`
      - `id` (uuid, primary key)
      - `user_id` (text) - Firebase Auth user ID
      - `mode_type` (text) - 'school' or 'work'
      - `school_mode_type` (text, nullable) - 'homework' or 'test_prep' for school mode
      - `subject_id` (uuid, nullable) - FK to school_subjects
      - `work_category_id` (uuid, nullable) - FK to work_categories
      - `custom_subject` (text, nullable) - For custom subjects not in predefined list
      - `custom_category` (text, nullable) - For custom work categories
      - `session_data` (jsonb) - Full session data including task details
      - `created_at` (timestamptz) - Session creation timestamp
      - `completed_at` (timestamptz, nullable) - Session completion timestamp
      - `duration_minutes` (integer) - Session duration
      - `xp_earned` (integer) - XP earned from session
  
  2. Security
    - Enable RLS on all tables
    - school_subjects and work_categories are public readable
    - focus_mode_sessions restricted to authenticated users, own data only
  
  3. Data Population
    - Insert comprehensive list of school subjects
    - Insert predefined work categories
*/

-- Create school_subjects table
CREATE TABLE IF NOT EXISTS school_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  category text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create work_categories table
CREATE TABLE IF NOT EXISTS work_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  category_type text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create focus_mode_sessions table
CREATE TABLE IF NOT EXISTS focus_mode_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  mode_type text NOT NULL CHECK (mode_type IN ('school', 'work')),
  school_mode_type text CHECK (school_mode_type IN ('homework', 'test_prep')),
  subject_id uuid REFERENCES school_subjects(id),
  work_category_id uuid REFERENCES work_categories(id),
  custom_subject text,
  custom_category text,
  session_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  duration_minutes integer DEFAULT 0,
  xp_earned integer DEFAULT 0
);

-- Enable RLS
ALTER TABLE school_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE focus_mode_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for school_subjects (public read)
CREATE POLICY "Anyone can view school subjects"
  ON school_subjects
  FOR SELECT
  TO public
  USING (is_active = true);

-- RLS Policies for work_categories (public read)
CREATE POLICY "Anyone can view work categories"
  ON work_categories
  FOR SELECT
  TO public
  USING (is_active = true);

-- RLS Policies for focus_mode_sessions
CREATE POLICY "Users can view own focus mode sessions"
  ON focus_mode_sessions
  FOR SELECT
  TO authenticated
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can insert own focus mode sessions"
  ON focus_mode_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update own focus mode sessions"
  ON focus_mode_sessions
  FOR UPDATE
  TO authenticated
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub')
  WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can delete own focus mode sessions"
  ON focus_mode_sessions
  FOR DELETE
  TO authenticated
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_focus_mode_sessions_user_id ON focus_mode_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_focus_mode_sessions_mode_type ON focus_mode_sessions(mode_type);
CREATE INDEX IF NOT EXISTS idx_focus_mode_sessions_created_at ON focus_mode_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_school_subjects_category ON school_subjects(category);
CREATE INDEX IF NOT EXISTS idx_work_categories_type ON work_categories(category_type);

-- Populate school_subjects
INSERT INTO school_subjects (name, category, display_order) VALUES
  -- STEM
  ('Mathematics', 'STEM', 1),
  ('Algebra', 'STEM', 2),
  ('Geometry', 'STEM', 3),
  ('Trigonometry', 'STEM', 4),
  ('Calculus', 'STEM', 5),
  ('Statistics', 'STEM', 6),
  ('Biology', 'STEM', 7),
  ('Chemistry', 'STEM', 8),
  ('Physics', 'STEM', 9),
  ('Computer Science', 'STEM', 10),
  ('Environmental Science', 'STEM', 11),
  
  -- Humanities
  ('English Literature', 'Humanities', 20),
  ('English Composition', 'Humanities', 21),
  ('Creative Writing', 'Humanities', 22),
  ('World History', 'Humanities', 23),
  ('US History', 'Humanities', 24),
  ('European History', 'Humanities', 25),
  ('Government', 'Humanities', 26),
  ('Economics', 'Humanities', 27),
  ('Psychology', 'Humanities', 28),
  ('Sociology', 'Humanities', 29),
  ('Philosophy', 'Humanities', 30),
  ('Geography', 'Humanities', 31),
  
  -- Languages
  ('Spanish', 'Languages', 40),
  ('French', 'Languages', 41),
  ('German', 'Languages', 42),
  ('Mandarin Chinese', 'Languages', 43),
  ('Japanese', 'Languages', 44),
  ('Latin', 'Languages', 45),
  ('Italian', 'Languages', 46),
  ('Arabic', 'Languages', 47),
  
  -- Arts
  ('Art', 'Arts', 60),
  ('Music', 'Arts', 61),
  ('Drama', 'Arts', 62),
  ('Dance', 'Arts', 63),
  ('Film Studies', 'Arts', 64),
  
  -- Other
  ('Physical Education', 'Other', 80),
  ('Health', 'Other', 81),
  ('Business', 'Other', 82),
  ('Accounting', 'Other', 83),
  ('Engineering', 'Other', 84),
  ('Other Subject', 'Other', 99)
ON CONFLICT (name) DO NOTHING;

-- Populate work_categories
INSERT INTO work_categories (name, category_type, display_order) VALUES
  -- Creative
  ('Content Creation', 'Creative', 1),
  ('Design Work', 'Creative', 2),
  ('Video Production', 'Creative', 3),
  ('Writing & Editing', 'Creative', 4),
  ('Marketing Campaigns', 'Creative', 5),
  
  -- Administrative
  ('Email Management', 'Administrative', 20),
  ('Document Processing', 'Administrative', 21),
  ('Schedule Management', 'Administrative', 22),
  ('Data Entry', 'Administrative', 23),
  ('Filing & Organization', 'Administrative', 24),
  
  -- Technical
  ('Software Development', 'Technical', 40),
  ('Code Review', 'Technical', 41),
  ('Testing & QA', 'Technical', 42),
  ('System Administration', 'Technical', 43),
  ('Technical Documentation', 'Technical', 44),
  ('Data Analysis', 'Technical', 45),
  ('Database Management', 'Technical', 46),
  
  -- Strategic
  ('Strategic Planning', 'Strategic', 60),
  ('Research & Analysis', 'Strategic', 61),
  ('Business Development', 'Strategic', 62),
  ('Financial Planning', 'Strategic', 63),
  ('Project Management', 'Strategic', 64),
  ('Report Writing', 'Strategic', 65),
  
  -- Collaborative
  ('Team Collaboration', 'Collaborative', 80),
  ('Meeting Preparation', 'Collaborative', 81),
  ('Client Communication', 'Collaborative', 82),
  ('Presentations', 'Collaborative', 83),
  ('Training & Mentoring', 'Collaborative', 84),
  ('Custom Category', 'Collaborative', 99)
ON CONFLICT (name) DO NOTHING;