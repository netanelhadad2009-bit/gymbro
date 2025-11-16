-- Create meals table for tracking user meals
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_meals_user_id ON public.meals (user_id);
CREATE INDEX IF NOT EXISTS idx_meals_date ON public.meals (date);
CREATE INDEX IF NOT EXISTS idx_meals_user_date ON public.meals (user_id, date);

-- Enable Row Level Security
ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
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

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_meals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update the updated_at column
CREATE TRIGGER update_meals_updated_at_trigger
    BEFORE UPDATE ON public.meals
    FOR EACH ROW
    EXECUTE FUNCTION update_meals_updated_at();

-- Create storage bucket for meal images if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('meal-images', 'meal-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for meal images
CREATE POLICY "Users can upload meal images" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'meal-images' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view meal images" ON storage.objects
    FOR SELECT USING (bucket_id = 'meal-images');

CREATE POLICY "Users can update own meal images" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'meal-images' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete own meal images" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'meal-images' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );