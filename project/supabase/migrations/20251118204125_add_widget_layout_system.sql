/*
  # Add Widget Layout System for Customizable Dashboard

  ## Overview
  This migration extends the dashboard customization system to support advanced
  widget layout features including positioning, sizing, and preset layouts.

  ## Changes

  ### 1. Widget Layout Preferences
  Extends the existing `preferences` column in `user_profiles` to include:
  - Widget positioning (grid-based coordinates)
  - Widget sizing (small, medium, large)
  - Widget visibility toggles
  - Custom layout configurations
  - Saved layout presets

  ### 2. New Widget Types
  Adds support for new dashboard widgets:
  - quickStats: Quick statistics overview
  - recentSessions: Recent session history
  - weather: Weather widget with local conditions
  - miniTimer: Quick start timer widget
  - goals: Personal goals tracker
  - focusAIPreview: Focus AI preview card (existing)
  - spotifyMusic: Spotify music widget

  ### 3. Widget Configuration Structure
  Each widget can have:
  - id: Unique widget identifier
  - visible: Boolean to show/hide widget
  - position: Grid position {row, col}
  - size: Widget size (small, medium, large)
  - settings: Widget-specific configuration

  ## Security
  - Uses existing RLS policies on user_profiles table
  - Users can only modify their own widget preferences
  - No additional permissions needed

  ## Notes
  - Backwards compatible with existing dashboard preferences
  - Default layout will show all widgets in a standard grid
  - Widget positions are responsive and adapt to screen size
*/

-- Update user_profiles preferences to include widget layout system
-- This extends the existing JSONB structure without breaking current data

-- Add comment to document the enhanced widget layout structure
COMMENT ON COLUMN user_profiles.preferences IS 
  'User preferences including privacy, defaults, notifications, dashboard widgets, and widget layout configuration. 
  Widget layout includes: widgetLayout (array of widget configs with id, visible, position, size, settings), 
  layoutPresets (saved layout configurations), activePreset (currently selected preset)';

-- Create index on widget layout for better query performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_preferences_widget_layout 
  ON user_profiles USING gin((preferences->'widgetLayout'));

-- Function to initialize default widget layout for existing users
CREATE OR REPLACE FUNCTION initialize_widget_layout()
RETURNS void AS $$
BEGIN
  -- Update users who don't have widgetLayout in preferences
  UPDATE user_profiles
  SET preferences = jsonb_set(
    COALESCE(preferences, '{}'::jsonb),
    '{widgetLayout}',
    '[
      {"id": "xpProgress", "visible": true, "position": {"row": 0, "col": 0}, "size": "medium"},
      {"id": "streakTracker", "visible": true, "position": {"row": 0, "col": 1}, "size": "medium"},
      {"id": "questsPreview", "visible": true, "position": {"row": 0, "col": 2}, "size": "medium"},
      {"id": "quickStats", "visible": true, "position": {"row": 1, "col": 0}, "size": "medium"},
      {"id": "recentSessions", "visible": true, "position": {"row": 1, "col": 1}, "size": "medium"},
      {"id": "dailyTip", "visible": true, "position": {"row": 2, "col": 0}, "size": "small"},
      {"id": "personalizedTips", "visible": true, "position": {"row": 2, "col": 1}, "size": "small"},
      {"id": "weather", "visible": true, "position": {"row": 2, "col": 2}, "size": "small"},
      {"id": "goals", "visible": true, "position": {"row": 3, "col": 0}, "size": "medium"},
      {"id": "miniTimer", "visible": true, "position": {"row": 3, "col": 1}, "size": "medium"},
      {"id": "focusAIPreview", "visible": false, "position": {"row": 4, "col": 0}, "size": "large"},
      {"id": "collectionsPreview", "visible": true, "position": {"row": 5, "col": 0}, "size": "large"}
    ]'::jsonb,
    true
  )
  WHERE preferences->'widgetLayout' IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Run the initialization function
SELECT initialize_widget_layout();

-- Create a function to add preset layouts
CREATE OR REPLACE FUNCTION add_default_layout_presets()
RETURNS void AS $$
BEGIN
  UPDATE user_profiles
  SET preferences = jsonb_set(
    COALESCE(preferences, '{}'::jsonb),
    '{layoutPresets}',
    '{
      "minimalist": {
        "name": "Minimalist",
        "description": "Clean and simple layout with essential widgets only",
        "widgets": ["xpProgress", "streakTracker", "miniTimer", "goals"]
      },
      "powerUser": {
        "name": "Power User",
        "description": "All widgets visible for maximum information",
        "widgets": ["xpProgress", "streakTracker", "questsPreview", "quickStats", "recentSessions", "dailyTip", "personalizedTips", "weather", "goals", "miniTimer", "focusAIPreview", "collectionsPreview"]
      },
      "balanced": {
        "name": "Balanced",
        "description": "Balanced mix of stats and motivation",
        "widgets": ["xpProgress", "streakTracker", "questsPreview", "quickStats", "dailyTip", "goals", "miniTimer"]
      },
      "focusMode": {
        "name": "Focus Mode",
        "description": "Minimal distractions, maximum productivity",
        "widgets": ["miniTimer", "goals", "quickStats", "streakTracker"]
      }
    }'::jsonb,
    true
  )
  WHERE preferences->'layoutPresets' IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Run the preset initialization
SELECT add_default_layout_presets();

-- Add a function to validate widget layout structure
CREATE OR REPLACE FUNCTION validate_widget_layout()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure widgetLayout is an array if it exists
  IF NEW.preferences->'widgetLayout' IS NOT NULL THEN
    IF jsonb_typeof(NEW.preferences->'widgetLayout') != 'array' THEN
      RAISE EXCEPTION 'widgetLayout must be an array';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate widget layout on insert/update
DROP TRIGGER IF EXISTS validate_widget_layout_trigger ON user_profiles;
CREATE TRIGGER validate_widget_layout_trigger
  BEFORE INSERT OR UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION validate_widget_layout();
