/*
  # Add Retroactive Achievement Tracking

  ## Overview
  This migration adds tracking fields to monitor retroactive achievement scanning for users.
  When users first use the new achievement system, their historical data will be scanned
  once to award any achievements they've already earned.

  ## Changes
  1. Add Fields to user_profiles
    - `retroactive_scan_completed` (boolean) - Whether retroactive scan has been performed
    - `retroactive_scan_date` (timestamptz) - When the scan was completed
    - `retroactive_achievements_count` (integer) - Number of achievements awarded retroactively

  2. Add Fields to achievements
    - `rarity` (text) - Achievement rarity (common, rare, epic, legendary)
    - `icon` (text) - Emoji icon for achievement display

  ## Security
  - No new RLS policies needed (existing policies cover these fields)
  - Fields are part of user's own profile data
*/

-- Add retroactive scan tracking fields to user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'retroactive_scan_completed'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN retroactive_scan_completed boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'retroactive_scan_date'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN retroactive_scan_date timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'retroactive_achievements_count'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN retroactive_achievements_count integer DEFAULT 0;
  END IF;
END $$;

-- Add rarity and icon fields to achievements table for better display
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'achievements' AND column_name = 'rarity'
  ) THEN
    ALTER TABLE achievements ADD COLUMN rarity text DEFAULT 'common';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'achievements' AND column_name = 'icon'
  ) THEN
    ALTER TABLE achievements ADD COLUMN icon text DEFAULT '🏆';
  END IF;
END $$;

-- Add constraint to ensure rarity is valid
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'valid_achievement_rarity'
  ) THEN
    ALTER TABLE achievements
    ADD CONSTRAINT valid_achievement_rarity
    CHECK (rarity IN ('common', 'rare', 'epic', 'legendary'));
  END IF;
END $$;