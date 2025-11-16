# Journey Stages System - Verification Guide

This guide helps you verify the Journey Stages flow is working end-to-end on both Web and Native (iOS).

## Overview

The Journey Stages system creates a linear progression of fitness stages for users. Each stage contains tasks that users complete to progress.

**Key Components:**
- **Database**: `user_stages` and `user_stage_tasks` tables with RLS
- **API**: `/api/journey/stages/bootstrap` (POST) creates stages
- **API**: `/api/journey/stages` (GET) fetches stages with progress
- **UI**: Journey page at `/journey` displays stages and tasks
- **Signup Flow**: Auto-creates stages after successful signup

---

## 1. Database Verification

### Prerequisites
- Access to Supabase SQL Editor
- Run the migration: `migrations/create_user_stages_system.sql`

### Run Verification Queries

Open Supabase SQL Editor and run queries from `migrations/verify_user_stages.sql`:

#### Quick Health Check
```sql
-- 1. Verify tables exist and RLS is enabled
SELECT
  table_name,
  (SELECT relrowsecurity FROM pg_class WHERE relname = table_name) as rls_enabled
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('user_stages', 'user_stage_tasks');
```

**Expected Result:**
```
table_name         | rls_enabled
-------------------+-------------
user_stages        | true
user_stage_tasks   | true
```

#### Check Recent Stages
```sql
-- 2. View all user stages (sorted by creation date)
SELECT
  id,
  user_id,
  stage_index,
  code,
  title_he,
  is_unlocked,
  is_completed,
  created_at
FROM user_stages
ORDER BY created_at DESC, stage_index ASC
LIMIT 20;
```

**Expected Result:** Should show stages for recent users, typically 3-5 stages per user.

#### Find Users Without Stages
```sql
-- 3. Find users without stages (for debugging)
SELECT
  u.id as user_id,
  u.email,
  u.created_at as user_created_at,
  COUNT(s.id) as stage_count
FROM auth.users u
LEFT JOIN user_stages s ON s.user_id = u.id
WHERE u.created_at > NOW() - INTERVAL '7 days'
GROUP BY u.id, u.email, u.created_at
HAVING COUNT(s.id) = 0
ORDER BY u.created_at DESC
LIMIT 10;
```

**Expected Result:** Should be empty (or minimal) for users created after the fix.

---

## 2. RLS Policy Verification

RLS policies ensure users can only access their own stages.

### Check Policies Exist
```sql
SELECT
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('user_stages', 'user_stage_tasks')
ORDER BY tablename, policyname;
```

**Expected Policies:**

**user_stages:**
- `stages_select_own` (SELECT)
- `stages_insert_own` (INSERT)
- `stages_update_own` (UPDATE)
- `stages_delete_own` (DELETE)

**user_stage_tasks:**
- `stage_tasks_select_via_stage` (SELECT)
- `stage_tasks_insert_via_stage` (INSERT)
- `stage_tasks_update_via_stage` (UPDATE)
- `stage_tasks_delete_via_stage` (DELETE)

### Test RLS (Optional)
1. Sign in as User A
2. Try to query User B's stages using their `user_id`
3. Should return empty (RLS blocks access)

---

## 3. API Endpoint Verification

### Test Bootstrap Endpoint

**Web:**
```bash
# From browser console (must be logged in)
fetch('/api/journey/stages/bootstrap', { method: 'POST' })
  .then(r => r.json())
  .then(console.log)
```

**Expected Response (first call):**
```json
{
  "ok": true,
  "created": 3,
  "existing": false,
  "message": "Created 3 stages"
}
```

**Expected Response (subsequent calls):**
```json
{
  "ok": true,
  "created": 0,
  "existing": true,
  "message": "Stages already exist"
}
```

### Test GET Endpoint

**Web:**
```bash
# From browser console (must be logged in)
fetch('/api/journey/stages')
  .then(r => r.json())
  .then(console.log)
```

**Expected Response:**
```json
{
  "ok": true,
  "stages": [
    {
      "id": "uuid",
      "stage_index": 1,
      "code": "FOUNDATION",
      "title_he": "יסודות",
      "is_unlocked": true,
      "is_completed": false,
      "tasks": [...]
    },
    ...
  ],
  "activeStageIndex": 0,
  "message": "Found 3 stages"
}
```

---

## 4. Signup Flow Verification

### Test New User Signup (Web)

1. **Open Dev Tools Console** (F12)
2. **Navigate to Signup Page**: `http://localhost:3000/signup`
3. **Complete Onboarding Flow**: Fill out all onboarding questions
4. **Generate Program**: Complete the program generation
5. **Sign Up**: Enter email/password and click "הרשמה"
6. **Watch Console Logs**: You should see:
   ```
   [Signup] Calling stages bootstrap...
   [Signup] Stages created: 3 stages
   ```
7. **Verify Redirect**: Should redirect to `/journey`
8. **Verify UI**: Should see stage map with tasks, NOT "אין שלבים זמינים"

### Test with Existing User (Web)

1. **Sign In**: Log in with existing account
2. **Navigate to Journey**: Go to `/journey`
3. **If Empty State Appears**:
   - Click "צור שלבים" button
   - Should create stages and reload
   - Map should appear with tasks

---

## 5. iOS/Native Verification

### Prerequisites
- Xcode with simulator
- Capacitor configured correctly
- Dev server running on port 3000

### Setup
```bash
# 1. Start dev server
cd apps/web
CAP_DEV=1 pnpm dev

# 2. Open iOS project
npx cap open ios

# 3. Run in simulator
```

### Test Flow
1. **Launch App** in simulator
2. **Complete Onboarding** (same as web)
3. **Sign Up** with new email
4. **Check Safari DevTools**:
   - Open Safari > Develop > Simulator > localhost
   - Watch console for `[Signup] Calling stages bootstrap...`
5. **Verify Journey Page**: Should show stage map immediately

### Common iOS Issues

**Issue: "אין שלבים זמינים"**
- Check dev server logs for bootstrap errors
- Verify Capacitor is using correct Supabase URL
- Check if auth session is valid (Network tab)

**Issue: 404 or network errors**
- Verify `capacitor.config.ts` points to `http://127.0.0.1:3000`
- Check dev server is running and accessible
- Try `CAP_DEV=1 pnpm dev` to ensure dev mode

---

## 6. Manual Testing Checklist

### New User Flow ✅
- [ ] Complete onboarding questionnaire
- [ ] Generate nutrition/workout plans
- [ ] Sign up with email/password
- [ ] Redirected to `/journey` automatically
- [ ] See stage map with tasks (NOT empty state)
- [ ] Stage 1 is unlocked
- [ ] Other stages are locked
- [ ] Can tap tasks to view details

### Existing User Flow ✅
- [ ] Sign in with existing account
- [ ] Navigate to `/journey`
- [ ] If no stages: "צור שלבים" button creates them
- [ ] Stage map appears after creation
- [ ] Stages persist after reload
- [ ] RLS prevents accessing other users' stages

### Stage Progression ✅
- [ ] Complete a task in Stage 1
- [ ] Task shows as completed
- [ ] Complete all tasks in Stage 1
- [ ] Stage 1 marked as completed
- [ ] Stage 2 unlocks automatically
- [ ] Can navigate between stages

---

## 7. Debugging

### Enable Enhanced Logging

Server logs show detailed info:
```bash
# Watch server logs
tail -f .next/trace

# Or check console if running dev server
pnpm dev
```

Look for:
- `[StagesBootstrap] Authenticated user:` - Shows user attempting bootstrap
- `[StagesBootstrap] Built stages:` - Number of stages generated
- `[StagesBootstrap] Success - created stages:` - Stages saved to DB
- `[StagesAPI] Found stages:` - Stages fetched for journey page

### Common Errors

**Error: "User avatar not found"**
- Avatar not created during signup
- Check `ensureAvatar()` in SignupClient.tsx
- Verify `avatars` table has row for user

**Error: "No stages found"**
- Bootstrap endpoint not called during signup
- Check signup flow calls `/api/journey/stages/bootstrap`
- Try manual creation with "צור שלבים" button

**Error: "Unauthorized"**
- User not logged in
- Session expired
- Check `supabase.auth.getSession()` returns valid session

**Error: Stages appear empty in UI**
- Tasks not loaded with stages
- Check `getUserStages()` joins `user_stage_tasks`
- Verify tasks were inserted during bootstrap

---

## 8. Success Criteria

✅ **Database:**
- Tables `user_stages` and `user_stage_tasks` exist
- RLS enabled with correct policies
- Indexes created for performance

✅ **API:**
- `/api/journey/stages/bootstrap` creates 3+ stages (idempotent)
- `/api/journey/stages` returns stages with tasks and progress
- Both endpoints require authentication

✅ **Signup Flow:**
- New users get stages created automatically
- Console logs show successful bootstrap
- No manual "צור שלבים" click needed

✅ **Journey UI:**
- Map displays stages and tasks immediately
- Stage 1 is unlocked by default
- Tasks show progress and completion state
- Empty state only appears if bootstrap truly fails

✅ **Cross-Platform:**
- Works identically on Web and iOS
- Same Supabase project and data
- RLS ensures data security

---

## 9. Rollback Plan

If issues occur, you can:

### Disable Auto-Bootstrap
```typescript
// In SignupClient.tsx, comment out:
// Step 4: Bootstrap journey stages
// try {
//   ...stages bootstrap code...
// } catch (err) { ... }
```

Users will need to click "צור שלבים" manually.

### Clear User Stages (for testing)
```sql
-- Delete all stages for a specific user
DELETE FROM user_stages WHERE user_id = 'USER_ID_HERE';
-- Tasks are cascade deleted automatically
```

### Revert Migration
```sql
-- Drop tables and policies
DROP TABLE IF EXISTS user_stage_tasks CASCADE;
DROP TABLE IF EXISTS user_stages CASCADE;
```

---

## 10. Next Steps

After verification is successful:

1. **Monitor Production**:
   - Watch Supabase logs for bootstrap errors
   - Check new user signup success rate
   - Monitor `/journey` page load times

2. **Add Monitoring**:
   - Log bootstrap failures to analytics
   - Track empty state displays
   - Alert if RLS errors spike

3. **Optimize**:
   - Add stage caching (Redis/memory)
   - Prefetch stages on signup
   - Lazy load task details

4. **Iterate**:
   - A/B test stage difficulty
   - Personalize tasks based on avatar
   - Add stage rewards and gamification

---

## Support

- **Database Issues**: Check Supabase logs and RLS policies
- **API Issues**: Review server logs and auth session
- **UI Issues**: Check browser console and network tab
- **iOS Issues**: Use Safari DevTools for WKWebView debugging

**Documentation:**
- Migration: `migrations/create_user_stages_system.sql`
- Verification: `migrations/verify_user_stages.sql`
- API: `apps/web/app/api/journey/stages/`
- UI: `apps/web/app/(app)/journey/page.tsx`
