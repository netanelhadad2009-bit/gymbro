-- Day Streak System
-- Tracks user daily activity streaks and activity log
-- Created: 2025-01-29

-- user_streaks table: stores current and max streak for each user
create table if not exists public.user_streaks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_streak int not null default 0,
  max_streak int not null default 0,
  last_checkin_date date,
  updated_at timestamptz not null default now()
);

-- user_activity table: logs each day a user had qualifying activity
-- Used to calculate streaks based on daily engagement
create table if not exists public.user_activity (
  user_id uuid not null references auth.users(id) on delete cascade,
  d date not null,
  source text not null default 'auto', -- 'nutrition', 'weight', 'workout', 'auto'
  created_at timestamptz not null default now(),
  primary key (user_id, d)
);

-- Enable Row Level Security
alter table public.user_streaks enable row level security;
alter table public.user_activity enable row level security;

-- RLS Policies for user_streaks
-- Users can only read their own streak data
drop policy if exists "own streak" on public.user_streaks;
create policy "own streak" on public.user_streaks
  for select using (auth.uid() = user_id);

-- Users can insert/update their own streak data
drop policy if exists "own streak upsert" on public.user_streaks;
create policy "own streak upsert" on public.user_streaks
  for insert with check (auth.uid() = user_id);

drop policy if exists "own streak update" on public.user_streaks;
create policy "own streak update" on public.user_streaks
  for update using (auth.uid() = user_id);

-- RLS Policies for user_activity
-- Users can only read their own activity
drop policy if exists "own activity read" on public.user_activity;
create policy "own activity read" on public.user_activity
  for select using (auth.uid() = user_id);

-- Users can insert their own activity (upsert pattern)
drop policy if exists "own activity upsert" on public.user_activity;
create policy "own activity upsert" on public.user_activity
  for insert with check (auth.uid() = user_id);

-- Create indexes for performance
create index if not exists idx_user_activity_user_date on public.user_activity(user_id, d desc);
create index if not exists idx_user_streaks_user on public.user_streaks(user_id);

-- Comment on tables
comment on table public.user_streaks is 'Tracks current and maximum daily streak for each user';
comment on table public.user_activity is 'Logs each day a user had qualifying activity (nutrition, workout, weigh-in)';
