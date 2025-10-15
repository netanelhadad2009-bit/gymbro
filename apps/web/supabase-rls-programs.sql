-- Enable Row Level Security on programs table
alter table public.programs enable row level security;

-- Policy: Users can only read their own programs
create policy "read own plans"
on public.programs
for select
to authenticated
using (auth.uid() = user_id);

-- Optional: Users can insert their own programs (if onboarding creates them)
create policy "insert own plans"
on public.programs
for insert
to authenticated
with check (auth.uid() = user_id);

-- Optional: Users can update their own programs
create policy "update own plans"
on public.programs
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Optional: Users can delete their own programs
create policy "delete own plans"
on public.programs
for delete
to authenticated
using (auth.uid() = user_id);
