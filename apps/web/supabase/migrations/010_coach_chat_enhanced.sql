-- Enhanced Coach Chat System
-- WhatsApp-style messaging with proper gating

-- ============================================================================
-- COACHES TABLE (Enhanced)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.coaches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name text NOT NULL,
    avatar_url text,
    active boolean DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coaches_user_id ON public.coaches(user_id);
CREATE INDEX IF NOT EXISTS idx_coaches_active ON public.coaches(active);

-- Enable RLS
ALTER TABLE public.coaches ENABLE ROW LEVEL SECURITY;

-- Anyone can view active coaches
CREATE POLICY "Active coaches viewable by all" ON public.coaches
    FOR SELECT
    USING (active = true);

-- ============================================================================
-- COACH_CLIENTS TABLE (Assignment/Link)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.coach_clients (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id uuid NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
    client_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    UNIQUE(coach_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_coach_clients_coach ON public.coach_clients(coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_clients_client ON public.coach_clients(client_id);

-- Enable RLS
ALTER TABLE public.coach_clients ENABLE ROW LEVEL SECURITY;

-- Clients can view their own assignments
CREATE POLICY "Clients view own assignments" ON public.coach_clients
    FOR SELECT
    USING (auth.uid() = client_id);

-- Coaches can view their client assignments
CREATE POLICY "Coaches view their clients" ON public.coach_clients
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.coaches
            WHERE coaches.id = coach_id
            AND coaches.user_id = auth.uid()
        )
    );

-- ============================================================================
-- MESSAGES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.coach_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id uuid NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
    client_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sender_role text NOT NULL CHECK (sender_role IN ('coach', 'client')),
    body text,
    image_url text,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    read_at timestamptz,
    CONSTRAINT has_content CHECK (body IS NOT NULL OR image_url IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_messages_thread ON public.coach_messages(coach_id, client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON public.coach_messages(coach_id, client_id, read_at) WHERE read_at IS NULL;

-- Enable RLS
ALTER TABLE public.coach_messages ENABLE ROW LEVEL SECURITY;

-- Clients can view messages in their thread
CREATE POLICY "Clients view own messages" ON public.coach_messages
    FOR SELECT
    USING (auth.uid() = client_id);

-- Coaches can view messages in their threads
CREATE POLICY "Coaches view client messages" ON public.coach_messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.coaches
            WHERE coaches.id = coach_id
            AND coaches.user_id = auth.uid()
        )
    );

-- Clients can insert their own messages
CREATE POLICY "Clients send messages" ON public.coach_messages
    FOR INSERT
    WITH CHECK (
        sender_role = 'client'
        AND auth.uid() = client_id
        AND EXISTS (
            SELECT 1 FROM public.coach_clients
            WHERE coach_clients.coach_id = coach_messages.coach_id
            AND coach_clients.client_id = auth.uid()
        )
    );

-- Coaches can insert messages to their clients
CREATE POLICY "Coaches send messages" ON public.coach_messages
    FOR INSERT
    WITH CHECK (
        sender_role = 'coach'
        AND EXISTS (
            SELECT 1 FROM public.coaches
            WHERE coaches.id = coach_id
            AND coaches.user_id = auth.uid()
            AND EXISTS (
                SELECT 1 FROM public.coach_clients
                WHERE coach_clients.coach_id = coaches.id
                AND coach_clients.client_id = coach_messages.client_id
            )
        )
    );

-- Allow marking messages as read
CREATE POLICY "Mark messages as read" ON public.coach_messages
    FOR UPDATE
    USING (
        auth.uid() = client_id OR
        EXISTS (
            SELECT 1 FROM public.coaches
            WHERE coaches.id = coach_id
            AND coaches.user_id = auth.uid()
        )
    )
    WITH CHECK (
        -- Only allow updating read_at
        read_at IS NOT NULL
    );

-- ============================================================================
-- COACH REQUESTS TABLE (for production flow)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.coach_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'rejected')),
    notes text,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coach_requests_user ON public.coach_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_coach_requests_status ON public.coach_requests(status, created_at DESC);

-- Enable RLS
ALTER TABLE public.coach_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "Users view own requests" ON public.coach_requests
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can create requests
CREATE POLICY "Users create requests" ON public.coach_requests
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- STORAGE BUCKET FOR CHAT MEDIA
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('coach-chat-media', 'coach-chat-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Clients upload chat media" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'coach-chat-media'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Anyone view chat media" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'coach-chat-media');

CREATE POLICY "Clients update own media" ON storage.objects
    FOR UPDATE
    USING (
        bucket_id = 'coach-chat-media'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Clients delete own media" ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'coach-chat-media'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get or create dev mock coach
CREATE OR REPLACE FUNCTION get_or_create_dev_coach(p_user_id uuid)
RETURNS uuid AS $$
DECLARE
    v_coach_id uuid;
BEGIN
    -- Check if user already has a coach
    SELECT coach_id INTO v_coach_id
    FROM public.coach_clients
    WHERE client_id = p_user_id
    LIMIT 1;

    IF v_coach_id IS NOT NULL THEN
        RETURN v_coach_id;
    END IF;

    -- Check if default dev coach exists
    SELECT id INTO v_coach_id
    FROM public.coaches
    WHERE display_name = 'מאמן לדוגמה'
    AND active = true
    LIMIT 1;

    -- Create dev coach if doesn't exist
    IF v_coach_id IS NULL THEN
        INSERT INTO public.coaches (display_name, avatar_url, active)
        VALUES ('מאמן לדוגמה', NULL, true)
        RETURNING id INTO v_coach_id;
    END IF;

    -- Link coach to user
    INSERT INTO public.coach_clients (coach_id, client_id)
    VALUES (v_coach_id, p_user_id)
    ON CONFLICT DO NOTHING;

    RETURN v_coach_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_read(
    p_coach_id uuid,
    p_client_id uuid,
    p_up_to_message_id uuid,
    p_reader_role text
)
RETURNS integer AS $$
DECLARE
    v_count integer;
BEGIN
    UPDATE public.coach_messages
    SET read_at = NOW()
    WHERE coach_id = p_coach_id
    AND client_id = p_client_id
    AND id <= p_up_to_message_id
    AND read_at IS NULL
    AND sender_role != p_reader_role;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SEED DATA (DEV)
-- ============================================================================

-- Create default dev coach
INSERT INTO public.coaches (id, display_name, avatar_url, active)
VALUES (
    '00000000-0000-0000-0000-000000000099',
    'דני כהן - מאמן',
    NULL,
    true
)
ON CONFLICT (id) DO NOTHING;
