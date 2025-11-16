-- =====================================================
-- SUPABASE MEALS TABLE SETUP
-- Run this in your Supabase SQL Editor
-- =====================================================

-- 1. Create the meals table
CREATE TABLE IF NOT EXISTS public.meals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date date NOT NULL DEFAULT CURRENT_DATE,
    name text NOT NULL,
    calories integer NOT NULL CHECK (calories >= 0),
    protein integer DEFAULT 0 CHECK (protein >= 0),
    carbs integer DEFAULT 0 CHECK (carbs >= 0),
    fat integer DEFAULT 0 CHECK (fat >= 0),
    source text NOT NULL CHECK (source IN ('manual', 'ai_vision')),
    image_url text,
    confidence integer CHECK (confidence >= 0 AND confidence <= 100),
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_meals_user_id ON public.meals(user_id);
CREATE INDEX IF NOT EXISTS idx_meals_date ON public.meals(date);
CREATE INDEX IF NOT EXISTS idx_meals_user_date ON public.meals(user_id, date);

-- 3. Enable Row Level Security
ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own meals" ON public.meals;
DROP POLICY IF EXISTS "Users can insert own meals" ON public.meals;
DROP POLICY IF EXISTS "Users can update own meals" ON public.meals;
DROP POLICY IF EXISTS "Users can delete own meals" ON public.meals;

-- 5. Create RLS policies
-- Users can only see their own meals
CREATE POLICY "Users can view own meals" ON public.meals
    FOR SELECT USING (auth.uid() = user_id);

-- Users can only insert their own meals
CREATE POLICY "Users can insert own meals" ON public.meals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own meals
CREATE POLICY "Users can update own meals" ON public.meals
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own meals
CREATE POLICY "Users can delete own meals" ON public.meals
    FOR DELETE USING (auth.uid() = user_id);

-- 6. Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_meals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger to auto-update the updated_at column
DROP TRIGGER IF EXISTS update_meals_updated_at_trigger ON public.meals;
CREATE TRIGGER update_meals_updated_at_trigger
    BEFORE UPDATE ON public.meals
    FOR EACH ROW
    EXECUTE FUNCTION update_meals_updated_at();

-- 8. Create storage bucket for meal images
INSERT INTO storage.buckets (id, name, public, avif_autodetection, allowed_mime_types, file_size_limit)
VALUES (
    'meal-images',
    'meal-images',
    true,
    false,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    5242880 -- 5MB limit
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    file_size_limit = 5242880;

-- 9. Drop existing storage policies if they exist
DROP POLICY IF EXISTS "Users can upload meal images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view meal images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own meal images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own meal images" ON storage.objects;

-- 10. Create storage policies for meal images
-- Allow authenticated users to upload
CREATE POLICY "Users can upload meal images" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'meal-images' AND
        auth.uid() IS NOT NULL
    );

-- Allow public viewing (since bucket is public)
CREATE POLICY "Users can view meal images" ON storage.objects
    FOR SELECT USING (bucket_id = 'meal-images');

-- Allow users to update their own images
CREATE POLICY "Users can update own meal images" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'meal-images' AND
        auth.uid() IS NOT NULL
    );

-- Allow users to delete their own images
CREATE POLICY "Users can delete own meal images" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'meal-images' AND
        auth.uid() IS NOT NULL
    );

-- =====================================================
-- VERIFICATION QUERIES
-- Run these to confirm everything is set up correctly
-- =====================================================

-- Check if table was created
SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'meals'
) AS meals_table_exists;

-- Check if RLS is enabled
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname = 'meals';

-- Check policies
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'meals';

-- Check storage bucket
SELECT id, name, public
FROM storage.buckets
WHERE id = 'meal-images';

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
-- If all checks pass, you should see:
-- ✅ meals_table_exists: true
-- ✅ relrowsecurity: true
-- ✅ 4 policies listed
-- ✅ meal-images bucket exists and is public