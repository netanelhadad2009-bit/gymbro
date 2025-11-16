# AI Coach Context - Verification & Testing Steps

## Step 1: Apply Migrations

Run these migrations in order in your Supabase SQL Editor:

### Migration 1: Fix fn_user_context (GROUP BY error)

```sql
-- File: supabase/migrations/019_fix_user_context_fn.sql
-- Copy the entire content from that file and run it
```

### Migration 2: Enable Realtime on ai_messages

```sql
-- File: supabase/migrations/020_enable_realtime_ai_messages.sql
-- Copy the entire content from that file and run it
```

## Step 2: Verify Database Setup

Run these verification queries in Supabase SQL Editor:

### 2.1 Check if fn_user_context compiles without errors

```sql
-- This should succeed (or fail with "Unauthorized" which means it works but needs auth)
SELECT public.fn_user_context(
  auth.uid(),
  CURRENT_DATE - INTERVAL '30 days',
  CURRENT_DATE
);
```

Expected: Either returns JSON data OR error "Unauthorized: cannot query other users data" (both are OK - means function works)

### 2.2 Verify ai_messages is in realtime publication

```sql
SELECT * FROM pg_publication_tables
WHERE pubname='supabase_realtime'
  AND schemaname='public'
  AND tablename='ai_messages';
```

Expected: Should return 1 row showing ai_messages is published

### 2.3 Check your messages exist

```sql
-- Replace YOUR_USER_ID with your actual user UUID
SELECT id, role, content, created_at
FROM public.ai_messages
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC
LIMIT 10;
```

Expected: Should show your recent messages (if any)

### 2.4 Test weigh_ins table

```sql
-- Check table exists and RLS works
SELECT COUNT(*) FROM public.weigh_ins;
```

Expected: Returns count (0 if no data, or actual count)

### 2.5 Test profiles table has new columns

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name IN ('age', 'gender', 'height_cm', 'weight_kg', 'goal', 'diet');
```

Expected: Should return 6 rows showing all the new columns

## Step 3: Test Frontend

### 3.1 Build Check

```bash
cd apps/web
npm run typecheck
```

Expected: No TypeScript errors in coach files

### 3.2 Start Development Server

```bash
npm run dev
```

### 3.3 Test Chat Flow

1. **Open browser** → `http://localhost:3000/coach`

2. **Check console logs** - you should see:
   ```
   [AI Coach] Fetching messages for user_id: ...
   [AI Coach] Fetched messages: X
   [AI Coach] Subscribing to messages for user_id: ...
   [AI Coach] Subscription status: SUBSCRIBED
   ```

3. **Send a test message**: "כמה אכלתי היום?"
   - User message should appear immediately
   - Check server logs (where you ran `npm run dev`):
     ```
     [AI Coach] Processing message for user: abc12345...
     [AI Coach] Detected intent: תזונה היום (nutrition_today)
     [AI Coach] Response path: direct
     ```
   - Assistant reply should appear within 1-2 seconds

4. **Verify Realtime** - open same page in another tab/window:
   - Send message in Tab 1
   - Message should appear in BOTH tabs immediately

## Step 4: Test Acceptance Scenarios

### Scenario 1: Nutrition Today (Direct Response)

**User message:** `כמה אכלתי היום?`

**Expected:**
- Server logs: `Response path: direct`
- Reply appears in < 500ms
- Reply format: "היום צרכת X קלוריות..." OR "עדיין לא צרכת ארוחות היום..."

### Scenario 2: Weight Trend (Direct Response)

**User message:** `מה המגמה במשקל?`

**Expected:**
- Server logs: `Response path: direct`
- Reply: Weight summary OR "אין נתוני שקילה זמינים..."

### Scenario 3: Free Query (Model Response)

**User message:** `תבנה לי תפריט ל-2200 קלוריות`

**Expected:**
- Server logs: `Response path: model`
- Server logs: `tokens: XXX` (some token count)
- Reply takes 2-5 seconds
- Reply is plain text (no asterisks, no markdown)

## Step 5: Check Error Handling

### 5.1 Simulate fetch error

In Supabase dashboard → Authentication → Policies:
- Temporarily disable the "Users can view own AI messages" policy
- Refresh `/coach` page
- Should see red error banner: "שגיאה בטעינת הצ'אט"
- Click "נסה שוב" button
- Re-enable the policy
- Click "נסה שוב" again → messages should load

### 5.2 Check context error doesn't break chat

In SQL editor, temporarily rename the function:

```sql
ALTER FUNCTION public.fn_user_context RENAME TO fn_user_context_backup;
```

- Send a message in chat
- Check server logs: Should see "Context fetch failed (non-fatal)"
- Message should still send and get response (just without context data)
- Restore function:

```sql
ALTER FUNCTION public.fn_user_context_backup RENAME TO fn_user_context;
```

## Step 6: Verify Logs

### Server Logs (npm run dev output)

Look for these patterns:

✅ **Good:**
```
[AI Coach] Processing message for user: abc12345...
[AI Coach] Message preview: כמה אכלתי היום?
[AI Coach] Detected intent: תזונה היום (nutrition_today)
[AI Coach] Profile loaded
[AI Coach] Context loaded: { hasProfile: true, mealCount: 5, weighInCount: 8 }
[AI Coach] Response path: direct
[AI Coach] User message inserted
[AI Coach] Assistant reply inserted
[AI Coach] ✓ Request completed: { intent: 'תזונה היום', path: 'direct', ... }
```

❌ **Bad (should NOT see):**
```
[AI Coach] Insert user message failed: ...
[AI Coach] Insert assistant reply failed: ...
Unexpected error: ...
```

### Browser Console Logs

✅ **Good:**
```
[AI Coach] Fetching messages for user_id: ...
[AI Coach] Fetched messages: 5
[AI Coach] Subscribing to messages for user_id: ...
[AI Coach] Subscription status: SUBSCRIBED
[AI Coach] Realtime event: INSERT { id: '...', role: 'user', ... }
[AI Coach] Realtime event: INSERT { id: '...', role: 'assistant', ... }
```

❌ **Bad (should NOT see):**
```
[AI Coach] Fetch error: ...
[AI Coach] Send error: ...
```

## Step 7: Production Checklist

Before deploying to production:

- [ ] All migrations applied successfully
- [ ] `fn_user_context` function compiles without errors
- [ ] `ai_messages` in `supabase_realtime` publication
- [ ] TypeScript builds without errors (`npm run typecheck`)
- [ ] Test messages appear in both user and assistant roles
- [ ] Realtime updates work (message appears in multiple tabs)
- [ ] Direct responses work for Hebrew intents
- [ ] Model responses include user context
- [ ] Error banner shows and recovers gracefully
- [ ] No PII in server logs (only truncated IDs)
- [ ] Plain text only (no markdown ** or ## in responses)

## Common Issues & Solutions

### Issue: "column must appear in GROUP BY or be used in aggregate"

**Solution:** Apply migration 019 which fixes the GROUP BY error in fn_user_context

### Issue: Messages don't appear in realtime

**Solutions:**
1. Check migration 020 was applied
2. Verify in SQL: `SELECT * FROM pg_publication_tables WHERE tablename='ai_messages'`
3. Check browser console for "Subscription status: SUBSCRIBED"

### Issue: "Unauthorized: cannot query other users data"

**Solution:** This is EXPECTED and means RLS is working correctly! The function will work when called with proper authentication.

### Issue: Chat loads but no context in responses

**Solutions:**
1. Check server logs for "Context loaded" or "Context fetch failed"
2. If failed, check fn_user_context was created successfully
3. Verify profiles table has new columns (age, gender, etc.)

### Issue: TypeScript errors after update

**Solution:** Run `npm install` to ensure all dependencies are installed

---

## Quick Test Script

Run this after applying migrations:

```bash
cd apps/web
tsx scripts/test-coach-context.ts
```

Expected output:
```
🧪 Testing AI Coach Context System

1️⃣  Checking database schema...
   ✅ weigh_ins table exists
   ✅ meals table exists

2️⃣  Checking SQL function...
   ✅ fn_user_context exists (RLS working as expected)

3️⃣  Checking profiles table schema...
   ✅ profiles table has nutrition/fitness columns

✅ Schema validation complete!
```

---

**Last Updated:** 2025-10-26
**Status:** Ready for Testing
