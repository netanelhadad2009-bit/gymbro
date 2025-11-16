-- Personal Coach System Migration
-- Creates tables for coach assignments, messages, tasks, sessions, and check-ins
-- with RLS policies and storage buckets

-- ============================================================================
-- COACHES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.coaches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name text NOT NULL,
    avatar_url text,
    bio text,
    credentials text,
    rating numeric CHECK (rating >= 0 AND rating <= 5),
    languages text[] DEFAULT '{}',
    tz text DEFAULT 'Asia/Jerusalem',
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coaches_rating ON public.coaches (rating DESC);

-- Enable RLS
ALTER TABLE public.coaches ENABLE ROW LEVEL SECURITY;

-- Everyone can view coaches (for browsing)
CREATE POLICY "Anyone can view coaches" ON public.coaches
    FOR SELECT USING (true);

-- ============================================================================
-- COACH ASSIGNMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.coach_assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    coach_id uuid NOT NULL REFERENCES public.coaches(id) ON DELETE RESTRICT,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'ended')),
    started_at timestamptz NOT NULL DEFAULT NOW(),
    ended_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- Ensure only one active assignment per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_coach_assignments_user_active
    ON public.coach_assignments (user_id)
    WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_coach_assignments_user_id ON public.coach_assignments (user_id);
CREATE INDEX IF NOT EXISTS idx_coach_assignments_coach_id ON public.coach_assignments (coach_id);

-- Enable RLS
ALTER TABLE public.coach_assignments ENABLE ROW LEVEL SECURITY;

-- Users can view their own assignments
CREATE POLICY "Users can view own assignments" ON public.coach_assignments
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own assignments (for requesting a coach)
CREATE POLICY "Users can create assignments" ON public.coach_assignments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own assignments
CREATE POLICY "Users can update own assignments" ON public.coach_assignments
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- COACH MESSAGES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.coach_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id uuid NOT NULL REFERENCES public.coach_assignments(id) ON DELETE CASCADE,
    sender text NOT NULL CHECK (sender IN ('user', 'coach')),
    content text NOT NULL,
    attachments jsonb DEFAULT '[]',
    created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coach_messages_assignment ON public.coach_messages (assignment_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coach_messages_created_at ON public.coach_messages (created_at DESC);

-- Enable RLS
ALTER TABLE public.coach_messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages from their assignments
CREATE POLICY "Users can view assignment messages" ON public.coach_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.coach_assignments
            WHERE coach_assignments.id = coach_messages.assignment_id
            AND coach_assignments.user_id = auth.uid()
        )
    );

-- Users can insert messages for their assignments
CREATE POLICY "Users can send messages" ON public.coach_messages
    FOR INSERT WITH CHECK (
        sender = 'user' AND
        EXISTS (
            SELECT 1 FROM public.coach_assignments
            WHERE coach_assignments.id = assignment_id
            AND coach_assignments.user_id = auth.uid()
        )
    );

-- ============================================================================
-- COACH TASKS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.coach_tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id uuid NOT NULL REFERENCES public.coach_assignments(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    due_date date,
    created_by text NOT NULL DEFAULT 'coach' CHECK (created_by IN ('coach', 'system')),
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coach_tasks_assignment ON public.coach_tasks (assignment_id);
CREATE INDEX IF NOT EXISTS idx_coach_tasks_due_date ON public.coach_tasks (due_date);

-- Enable RLS
ALTER TABLE public.coach_tasks ENABLE ROW LEVEL SECURITY;

-- Users can view tasks from their assignments
CREATE POLICY "Users can view assignment tasks" ON public.coach_tasks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.coach_assignments
            WHERE coach_assignments.id = coach_tasks.assignment_id
            AND coach_assignments.user_id = auth.uid()
        )
    );

-- ============================================================================
-- COACH TASK COMPLETIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.coach_task_completions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id uuid NOT NULL REFERENCES public.coach_tasks(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    completed_at timestamptz NOT NULL DEFAULT NOW(),
    note text,
    created_at timestamptz NOT NULL DEFAULT NOW()
);

-- Ensure one completion per task per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_coach_task_completions_task_user
    ON public.coach_task_completions (task_id, user_id);

CREATE INDEX IF NOT EXISTS idx_coach_task_completions_user ON public.coach_task_completions (user_id);

-- Enable RLS
ALTER TABLE public.coach_task_completions ENABLE ROW LEVEL SECURITY;

-- Users can view their own task completions
CREATE POLICY "Users can view own completions" ON public.coach_task_completions
    FOR SELECT USING (auth.uid() = user_id);

-- Users can create/update their own task completions
CREATE POLICY "Users can manage own completions" ON public.coach_task_completions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own completions" ON public.coach_task_completions
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own task completions
CREATE POLICY "Users can delete own completions" ON public.coach_task_completions
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- COACH SESSIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.coach_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id uuid NOT NULL REFERENCES public.coach_assignments(id) ON DELETE CASCADE,
    start_t timestamptz NOT NULL,
    end_t timestamptz NOT NULL,
    kind text NOT NULL CHECK (kind IN ('video', 'in_person', 'gym')),
    meet_url text,
    location text,
    status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'canceled')),
    notes text,
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_time_range CHECK (end_t > start_t)
);

CREATE INDEX IF NOT EXISTS idx_coach_sessions_assignment ON public.coach_sessions (assignment_id);
CREATE INDEX IF NOT EXISTS idx_coach_sessions_start_time ON public.coach_sessions (start_t);

-- Enable RLS
ALTER TABLE public.coach_sessions ENABLE ROW LEVEL SECURITY;

-- Users can view sessions from their assignments
CREATE POLICY "Users can view assignment sessions" ON public.coach_sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.coach_assignments
            WHERE coach_assignments.id = coach_sessions.assignment_id
            AND coach_assignments.user_id = auth.uid()
        )
    );

-- Users can create sessions for their assignments
CREATE POLICY "Users can create sessions" ON public.coach_sessions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.coach_assignments
            WHERE coach_assignments.id = assignment_id
            AND coach_assignments.user_id = auth.uid()
        )
    );

-- Users can update their own sessions
CREATE POLICY "Users can update own sessions" ON public.coach_sessions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.coach_assignments
            WHERE coach_assignments.id = assignment_id
            AND coach_assignments.user_id = auth.uid()
        )
    );

-- ============================================================================
-- CHECK-INS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.checkins (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id uuid NOT NULL REFERENCES public.coach_assignments(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date date NOT NULL DEFAULT CURRENT_DATE,
    weight_kg numeric CHECK (weight_kg >= 0),
    mood int2 CHECK (mood >= 0 AND mood <= 5),
    energy int2 CHECK (energy >= 0 AND energy <= 5),
    note text,
    photos text[] DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT NOW(),
    updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checkins_assignment ON public.checkins (assignment_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_checkins_user ON public.checkins (user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_checkins_date ON public.checkins (date DESC);

-- Enable RLS
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;

-- Users can view their own check-ins
CREATE POLICY "Users can view own checkins" ON public.checkins
    FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own check-ins
CREATE POLICY "Users can create checkins" ON public.checkins
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own check-ins
CREATE POLICY "Users can update own checkins" ON public.checkins
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own check-ins
CREATE POLICY "Users can delete own checkins" ON public.checkins
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- STORAGE BUCKET FOR CHECK-IN PHOTOS
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('checkin-photos', 'checkin-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for check-in photos
CREATE POLICY "Users can upload checkin photos" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'checkin-photos' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Anyone can view checkin photos" ON storage.objects
    FOR SELECT USING (bucket_id = 'checkin-photos');

CREATE POLICY "Users can update own checkin photos" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'checkin-photos' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete own checkin photos" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'checkin-photos' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- ============================================================================
-- UPDATE TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_coach_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at columns
CREATE TRIGGER update_coaches_updated_at_trigger
    BEFORE UPDATE ON public.coaches
    FOR EACH ROW
    EXECUTE FUNCTION update_coach_updated_at();

CREATE TRIGGER update_coach_assignments_updated_at_trigger
    BEFORE UPDATE ON public.coach_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_coach_updated_at();

CREATE TRIGGER update_coach_tasks_updated_at_trigger
    BEFORE UPDATE ON public.coach_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_coach_updated_at();

CREATE TRIGGER update_coach_sessions_updated_at_trigger
    BEFORE UPDATE ON public.coach_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_coach_updated_at();

CREATE TRIGGER update_checkins_updated_at_trigger
    BEFORE UPDATE ON public.checkins
    FOR EACH ROW
    EXECUTE FUNCTION update_coach_updated_at();

-- ============================================================================
-- SEED DATA (Optional - for development)
-- ============================================================================

-- Insert a sample coach
INSERT INTO public.coaches (id, full_name, avatar_url, bio, credentials, rating, languages, tz)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'דני כהן',
    NULL,
    'מאמן כושר מוסמך עם ניסיון של 10 שנים בתחום האימון האישי והתזונה. מתמחה בהרזיה, בניית שריר, ושיפור ביצועים ספורטיביים.',
    'מאמן כושר מוסמך ISSA, יועץ תזונה',
    4.8,
    ARRAY['עברית', 'אנגלית'],
    'Asia/Jerusalem'
)
ON CONFLICT (id) DO NOTHING;
