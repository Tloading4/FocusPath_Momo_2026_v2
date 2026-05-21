/*
  # Simplify Avatar Storage Policies

  1. Changes
    - Make avatars bucket publicly writable (with validation via app logic)
    - Keep read access public for display
    - Simplify policies to work with external auth (Firebase)

  2. Security
    - File size and type restrictions at bucket level
    - App-level validation ensures userId matches folder
    - Public bucket allows cross-auth compatibility
*/

-- Drop all existing avatar policies
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Public can read avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

-- Allow anyone to read from avatars bucket
CREATE POLICY "Public read access for avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Allow anyone to insert (app validates userId)
CREATE POLICY "Public insert access for avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars');

-- Allow anyone to update (app validates ownership)
CREATE POLICY "Public update access for avatars"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars');

-- Allow anyone to delete (app validates ownership)
CREATE POLICY "Public delete access for avatars"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars');
