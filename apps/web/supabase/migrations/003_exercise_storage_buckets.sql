-- Supabase Storage Buckets for Exercise Library
-- Videos (private with signed URLs) and Thumbnails (public)

-- Create exercise-videos bucket (private, signed URLs)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'exercise-videos',
  'exercise-videos',
  false,
  104857600, -- 100MB limit
  ARRAY['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm']
)
ON CONFLICT (id) DO NOTHING;

-- Create exercise-thumbs bucket (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'exercise-thumbs',
  'exercise-thumbs',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for exercise-videos bucket
-- Admin can upload/update/delete
CREATE POLICY "exercise_videos_admin_all"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'exercise-videos' AND
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  )
  WITH CHECK (
    bucket_id = 'exercise-videos' AND
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  );

-- All authenticated users can read (for signed URLs)
CREATE POLICY "exercise_videos_read_all"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'exercise-videos');

-- RLS policies for exercise-thumbs bucket (public)
-- Admin can upload/update/delete
CREATE POLICY "exercise_thumbs_admin_all"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'exercise-thumbs' AND
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  )
  WITH CHECK (
    bucket_id = 'exercise-thumbs' AND
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  );

-- Public read access for thumbnails
CREATE POLICY "exercise_thumbs_read_all"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'exercise-thumbs');
