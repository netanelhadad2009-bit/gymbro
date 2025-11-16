# 🔧 Fix: Supabase Schema Cache Issue

## Problem
PostgREST error: **"Could not find the 'profile_snapshot' column of 'ai_messages' in the schema cache"**

This happens when:
- The column was added in a previous session but PostgREST cache wasn't refreshed
- The migration was applied but the API server didn't reload

---

## ✅ Solution: Run These Steps in Order

### Step 1: Run Both Migrations in Supabase SQL Editor

Go to: https://supabase.com/dashboard/project/ivzltlqsjrikffssyvbr/sql/new

#### 1A. Run Migration 013 (RLS Policies)

Copy and paste this entire SQL block:

```sql
-- 013_fix_ai_messages_rls.sql
-- Fix RLS policies for ai_messages table to ensure proper authentication

-- Ensure table exists
CREATE TABLE IF NOT EXISTS public.ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL,
  profile_snapshot jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_ai_messages_user_id_created_at
  ON public.ai_messages (user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist (idempotent)
DO $$
BEGIN
  IF EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ai_messages' AND policyname='ai_messages_select_own') THEN
    DROP POLICY "ai_messages_select_own" ON public.ai_messages;
  END IF;
  IF EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ai_messages' AND policyname='ai_messages_insert_self') THEN
    DROP POLICY "ai_messages_insert_self" ON public.ai_messages;
  END IF;
  IF EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ai_messages' AND policyname='ai_messages_delete_own') THEN
    DROP POLICY "ai_messages_delete_own" ON public.ai_messages;
  END IF;
  IF EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ai_messages' AND policyname='ai_messages_update_own') THEN
    DROP POLICY "ai_messages_update_own" ON public.ai_messages;
  END IF;
END $$;

-- Recreate least-privilege policies
CREATE POLICY "ai_messages_select_own"
  ON public.ai_messages
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "ai_messages_insert_self"
  ON public.ai_messages
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ai_messages_update_own"
  ON public.ai_messages
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ai_messages_delete_own"
  ON public.ai_messages
  FOR DELETE
  USING (auth.uid() = user_id);
```

**Expected result:** ✅ "Success. No rows returned"

---

#### 1B. Run Migration 014 (Schema Cache Fix)

Copy and paste this entire SQL block:

```sql
-- 014_fix_profile_snapshot_column.sql
-- Fix schema cache issue: ensure profile_snapshot column exists and reload PostgREST schema

-- Add profile_snapshot column if missing (idempotent)
ALTER TABLE public.ai_messages
  ADD COLUMN IF NOT EXISTS profile_snapshot jsonb;

-- Add GIN index for efficient JSONB queries (idempotent)
CREATE INDEX IF NOT EXISTS idx_ai_messages_profile_snapshot
  ON public.ai_messages USING gin (profile_snapshot);

-- Add comment for documentation
COMMENT ON COLUMN public.ai_messages.profile_snapshot IS
  'Snapshot of user profile at time of message (age, gender, weight, goals, diet, injuries, etc.)';

-- Verify RLS policies exist
DO $$
DECLARE
  policy_count integer;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'ai_messages'
    AND policyname IN (
      'ai_messages_select_own',
      'ai_messages_insert_self',
      'ai_messages_update_own',
      'ai_messages_delete_own'
    );

  IF policy_count < 4 THEN
    RAISE WARNING 'Expected 4 RLS policies on ai_messages, found %. Run migration 013 first.', policy_count;
  ELSE
    RAISE NOTICE 'All 4 RLS policies verified on ai_messages table';
  END IF;
END $$;

-- Force PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
```

**Expected result:** ✅ "Success. No rows returned" + Notice about RLS policies

---

### Step 2: Verify Column Exists

Run this query to confirm:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'ai_messages'
ORDER BY ordinal_position;
```

**Expected columns:**
- id (uuid)
- user_id (uuid)
- role (text)
- content (text)
- profile_snapshot (jsonb) ← **THIS SHOULD BE PRESENT**
- created_at (timestamp with time zone)

---

### Step 3: Verify RLS Policies

Run this query:

```sql
SELECT policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'ai_messages'
ORDER BY policyname;
```

**Expected policies (all 4):**
- ai_messages_delete_own (DELETE)
- ai_messages_insert_self (INSERT)
- ai_messages_select_own (SELECT)
- ai_messages_update_own (UPDATE)

---

### Step 4: Restart Local Dev Server

```bash
cd /Users/netanelhadad/Projects/gymbro
pnpm -C apps/web dev
```

---

### Step 5: Test the Fix

#### 5A. Test RLS (in browser console while logged in)

```javascript
fetch("/api/coach/self-test", { method: "POST" })
  .then(r => r.json())
  .then(console.log)
```

**Expected result:**
```json
{
  "ok": true,
  "message": "RLS policies working correctly",
  "user_id": "..."
}
```

#### 5B. Test Chat Message

1. Navigate to the coach page in your app
2. Send a test message (e.g., "היי")
3. Check browser console logs for detailed flow
4. Check terminal logs for server-side processing

**Expected behavior:**
- Message appears in chat
- AI responds
- No "Load failed" error
- Server logs show successful insert

---

## 🔍 Troubleshooting

### If self-test fails with RLS error:

1. Check you're logged in (run in console):
```javascript
await (await fetch('/api/auth/session')).json()
```

2. Verify RLS policies exist (see Step 3 above)

3. Re-run migration 013

### If you still see "column not found":

1. Force reload schema:
```sql
NOTIFY pgrst, 'reload schema';
```

2. Wait 5 seconds, then test again

3. If still failing, restart Supabase project:
   - Go to project settings
   - Click "Pause project"
   - Wait 10 seconds
   - Click "Resume project"

### If chat shows "Load failed":

1. Check terminal logs for the exact error
2. Look for the last successful log statement
3. Common issues:
   - **"Unauthorized"** → User not logged in, check cookies
   - **"new row violates row-level security"** → RLS policies not applied
   - **"relation does not exist"** → Run migrations
   - **"column not found"** → Run migration 014 + reload schema

---

## 📝 Summary

**Migrations to run (in order):**
1. `013_fix_ai_messages_rls.sql` - RLS policies
2. `014_fix_profile_snapshot_column.sql` - Column + schema reload

**Both migrations are idempotent** - safe to run multiple times.

**After migrations:**
- Restart dev server
- Run self-test
- Send a chat message

---

## 🎯 Quick Copy-Paste Checklist

```bash
# 1. Open Supabase SQL Editor
# https://supabase.com/dashboard/project/ivzltlqsjrikffssyvbr/sql/new

# 2. Run migration 013 (copy from Step 1A above)

# 3. Run migration 014 (copy from Step 1B above)

# 4. Restart dev server
cd /Users/netanelhadad/Projects/gymbro
pnpm -C apps/web dev

# 5. Test in browser console
fetch("/api/coach/self-test", { method: "POST" }).then(r => r.json()).then(console.log)
```

Expected final result: ✅ Chat works, messages save, AI responds, no errors.
