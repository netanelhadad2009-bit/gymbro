-- ============================================================================
-- Storage Buckets and Policies for Exercise Assets
-- ============================================================================
-- This migration creates storage buckets for exercise videos and thumbnails
-- with appropriate RLS policies (does NOT reference storage.policies)

-- ----------------------------------------------------------------------------
-- 1. Create storage buckets
-- ----------------------------------------------------------------------------

-- Thumbnails bucket (public read access)
INSERT INTO storage.buckets (id, name, public)
VALUES ('exercise-thumbs', 'exercise-thumbs', true)
ON CONFLICT (id) DO NOTHING;

-- Videos bucket (private, accessed via signed URLs)
INSERT INTO storage.buckets (id, name, public)
VALUES ('exercise-videos', 'exercise-videos', false)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2. RLS Policies for storage.objects
-- ----------------------------------------------------------------------------
-- Note: We create policies on storage.objects, NOT storage.policies

-- Thumbnails: Public read access
DROP POLICY IF EXISTS "thumbs_public_read" ON storage.objects;
CREATE POLICY "thumbs_public_read"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'exercise-thumbs');

-- Thumbnails: Authenticated users can upload
DROP POLICY IF EXISTS "thumbs_auth_write" ON storage.objects;
CREATE POLICY "thumbs_auth_write"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'exercise-thumbs');

-- Thumbnails: Authenticated users can update their uploads
DROP POLICY IF EXISTS "thumbs_auth_update" ON storage.objects;
CREATE POLICY "thumbs_auth_update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'exercise-thumbs')
  WITH CHECK (bucket_id = 'exercise-thumbs');

-- Thumbnails: Authenticated users can delete
DROP POLICY IF EXISTS "thumbs_auth_delete" ON storage.objects;
CREATE POLICY "thumbs_auth_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'exercise-thumbs');

-- Videos: Authenticated read (for signed URL generation)
DROP POLICY IF EXISTS "videos_auth_select" ON storage.objects;
CREATE POLICY "videos_auth_select"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'exercise-videos');

-- Videos: Authenticated users can upload
DROP POLICY IF EXISTS "videos_auth_insert" ON storage.objects;
CREATE POLICY "videos_auth_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'exercise-videos');

-- Videos: Authenticated users can update
DROP POLICY IF EXISTS "videos_auth_update" ON storage.objects;
CREATE POLICY "videos_auth_update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'exercise-videos')
  WITH CHECK (bucket_id = 'exercise-videos');

-- Videos: Authenticated users can delete
DROP POLICY IF EXISTS "videos_auth_delete" ON storage.objects;
CREATE POLICY "videos_auth_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'exercise-videos');

-- ============================================================================
-- End of migration
-- ============================================================================
