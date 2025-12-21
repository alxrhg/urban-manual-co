-- Create the 'images' storage bucket for admin CMS uploads (brand logos, city images, etc.)

-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'images',
  'images',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist (safe for re-runs)
DROP POLICY IF EXISTS "Public read access for images" ON storage.objects;
DROP POLICY IF EXISTS "Admin upload access for images" ON storage.objects;
DROP POLICY IF EXISTS "Admin update access for images" ON storage.objects;
DROP POLICY IF EXISTS "Admin delete access for images" ON storage.objects;

-- Policy: Allow anyone to read images (public bucket)
CREATE POLICY "Public read access for images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'images');

-- Policy: Allow authenticated admins to upload images
-- Admin role is stored in app_metadata (set via Supabase dashboard or service role)
CREATE POLICY "Admin upload access for images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'images'
  AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- Policy: Allow authenticated admins to update images
CREATE POLICY "Admin update access for images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'images'
  AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- Policy: Allow authenticated admins to delete images
CREATE POLICY "Admin delete access for images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'images'
  AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);
