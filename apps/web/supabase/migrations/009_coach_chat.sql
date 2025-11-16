-- Coach Chat System Migration
-- WhatsApp-style real-time messaging between users and coaches

-- ============================================================================
-- ENABLE UUID EXTENSION (if not already enabled)
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- THREADS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.coach_threads (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id uuid NOT NULL REFERENCES public.coach_assignments(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    coach_id uuid NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    UNIQUE(assignment_id)
);

CREATE INDEX IF NOT EXISTS idx_threads_user ON public.coach_threads(user_id);
CREATE INDEX IF NOT EXISTS idx_threads_coach ON public.coach_threads(coach_id);
CREATE INDEX IF NOT EXISTS idx_threads_assignment ON public.coach_threads(assignment_id);

-- Enable RLS
ALTER TABLE public.coach_threads ENABLE ROW LEVEL SECURITY;

-- Thread readable by members (user or coach)
CREATE POLICY "thread readable by members" ON public.coach_threads
    FOR SELECT
    USING (
        auth.uid() = user_id OR auth.uid() = coach_id
    );

-- Thread insertable by members
CREATE POLICY "thread insert by members" ON public.coach_threads
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_id OR auth.uid() = coach_id
    );

-- ============================================================================
-- MESSAGES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.coach_chat_messages (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    thread_id uuid NOT NULL REFERENCES public.coach_threads(id) ON DELETE CASCADE,
    sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sender_role text NOT NULL CHECK (sender_role IN ('user', 'coach')),
    body text,
    attachment_url text,
    attachment_type text CHECK (attachment_type IN ('image', 'audio', 'file', NULL)),
    delivered_at timestamptz,
    read_at timestamptz,
    edited_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_msgs_thread_created ON public.coach_chat_messages(thread_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_msgs_read ON public.coach_chat_messages(thread_id, read_at);
CREATE INDEX IF NOT EXISTS idx_msgs_delivered ON public.coach_chat_messages(thread_id, delivered_at);
CREATE INDEX IF NOT EXISTS idx_msgs_sender ON public.coach_chat_messages(sender_id);

-- Enable RLS
ALTER TABLE public.coach_chat_messages ENABLE ROW LEVEL SECURITY;

-- Messages readable by thread members
CREATE POLICY "messages readable by members" ON public.coach_chat_messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.coach_threads t
            WHERE t.id = thread_id
            AND (auth.uid() = t.user_id OR auth.uid() = t.coach_id)
        )
    );

-- Messages insertable by thread members
CREATE POLICY "messages insert by members" ON public.coach_chat_messages
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.coach_threads t
            WHERE t.id = thread_id
            AND (auth.uid() = t.user_id OR auth.uid() = t.coach_id)
        )
        AND auth.uid() = sender_id
    );

-- Messages updatable by thread members (for delivered/read status and editing)
CREATE POLICY "messages update by members" ON public.coach_chat_messages
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.coach_threads t
            WHERE t.id = thread_id
            AND (auth.uid() = t.user_id OR auth.uid() = t.coach_id)
        )
    );

-- ============================================================================
-- PRESENCE TABLE (for typing indicators and online status)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.coach_presence (
    thread_id uuid NOT NULL REFERENCES public.coach_threads(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role text NOT NULL CHECK (role IN ('user', 'coach')),
    typing boolean NOT NULL DEFAULT false,
    last_seen timestamptz NOT NULL DEFAULT NOW(),
    PRIMARY KEY (thread_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_presence_thread ON public.coach_presence(thread_id);
CREATE INDEX IF NOT EXISTS idx_presence_last_seen ON public.coach_presence(thread_id, last_seen);

-- Enable RLS
ALTER TABLE public.coach_presence ENABLE ROW LEVEL SECURITY;

-- Presence readable by thread members
CREATE POLICY "presence readable by members" ON public.coach_presence
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.coach_threads t
            WHERE t.id = thread_id
            AND (auth.uid() = t.user_id OR auth.uid() = t.coach_id)
        )
    );

-- Presence insertable/updatable by thread members
CREATE POLICY "presence upsert by members" ON public.coach_presence
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.coach_threads t
            WHERE t.id = thread_id
            AND (auth.uid() = t.user_id OR auth.uid() = t.coach_id)
        )
        AND auth.uid() = user_id
    );

CREATE POLICY "presence update by members" ON public.coach_presence
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.coach_threads t
            WHERE t.id = thread_id
            AND (auth.uid() = t.user_id OR auth.uid() = t.coach_id)
        )
        AND auth.uid() = user_id
    );

-- ============================================================================
-- STORAGE BUCKET FOR CHAT UPLOADS
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-uploads', 'chat-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for chat uploads
-- Users can upload to their thread folders
CREATE POLICY "Chat uploads insert by thread members" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'chat-uploads'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Anyone can view chat uploads (public bucket)
CREATE POLICY "Chat uploads viewable by all" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'chat-uploads');

-- Users can update/delete their own uploads
CREATE POLICY "Chat uploads update by owner" ON storage.objects
    FOR UPDATE
    USING (
        bucket_id = 'chat-uploads'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Chat uploads delete by owner" ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'chat-uploads'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to automatically set delivered_at when message is echoed back via Realtime
-- (Can be called from client or trigger)
CREATE OR REPLACE FUNCTION mark_message_delivered(message_id uuid)
RETURNS void AS $$
BEGIN
    UPDATE public.coach_chat_messages
    SET delivered_at = NOW()
    WHERE id = message_id
    AND delivered_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old presence records (can be run via cron)
CREATE OR REPLACE FUNCTION cleanup_old_presence()
RETURNS void AS $$
BEGIN
    DELETE FROM public.coach_presence
    WHERE last_seen < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SAMPLE DATA (for testing)
-- ============================================================================

-- Note: Assumes you have a coach and user with an active assignment
-- Run this manually after creating test users/coaches

-- Example to create a test thread:
-- INSERT INTO public.coach_threads (assignment_id, user_id, coach_id)
-- SELECT id, user_id, coach_id
-- FROM public.coach_assignments
-- WHERE status = 'active'
-- LIMIT 1;
