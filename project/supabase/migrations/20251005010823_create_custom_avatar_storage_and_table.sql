/*
  # Custom Avatar Storage Setup

  1. Storage Bucket
    - Creates 'avatars' storage bucket for user profile photos
    - Sets file size limit to 5MB
    - Restricts to image formats only (image/jpeg, image/png, image/webp)
    - Configured as public bucket for easy access

  2. New Table
    - `custom_avatars`
      - `id` (uuid, primary key)
      - `user_id` (text, references auth user)
      - `storage_path` (text, path to file in storage)
      - `file_name` (text, original filename)
      - `file_size` (integer, size in bytes)
      - `mime_type` (text, file content type)
      - `uploaded_at` (timestamptz, upload timestamp)
      - `is_active` (boolean, whether currently equipped)
      - `thumbnail_url` (text, optional processed thumbnail)

  3. Security
    - Enable RLS on custom_avatars table
    - Users can only view and manage their own avatar uploads
    - Storage policies allow authenticated users to upload/read own files

  4. Indexes
    - Index on user_id for fast lookups
    - Index on is_active for quick active avatar queries
*/

-- Create storage bucket for avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5MB in bytes
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Create custom_avatars table
CREATE TABLE IF NOT EXISTS custom_avatars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  file_size integer NOT NULL DEFAULT 0,
  mime_type text NOT NULL,
  uploaded_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT false,
  thumbnail_url text,
  CONSTRAINT custom_avatars_user_id_key UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE custom_avatars ENABLE ROW LEVEL SECURITY;

-- RLS Policies for custom_avatars table
CREATE POLICY "Users can view own custom avatar"
  ON custom_avatars FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert own custom avatar"
  ON custom_avatars FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update own custom avatar"
  ON custom_avatars FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can delete own custom avatar"
  ON custom_avatars FOR DELETE
  TO authenticated
  USING (user_id = auth.uid()::text);

-- Storage policies for avatars bucket
CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can read own avatar"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'avatars' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Public can read avatars"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND 
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_custom_avatars_user_id ON custom_avatars(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_avatars_is_active ON custom_avatars(is_active);
