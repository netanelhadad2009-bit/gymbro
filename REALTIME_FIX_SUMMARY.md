# Realtime Fix Summary

## Status: Ready for Testing

All code fixes have been implemented. SQL verification steps are ready to execute.

---

## What Was Fixed

### 1. Critical Bug in [lib/realtime.ts](apps/web/lib/realtime.ts)

**Problem:** Reconnection logic created orphaned subscriptions that were never cleaned up.

**Fix:** Rewrote with proper state management using a single `currentChannel` reference.

### 2. Enhanced Logging

Added emoji-based logging throughout realtime flow for easy debugging:
- 🔌 Initialization
- 📡 Channel creation
- ✅ Success
- ✉️ Event received
- 📨 Callback triggered
- ⚠️ Warnings/errors

### 3. Diagnostic Endpoint

Created [app/api/debug/realtime/route.ts](apps/web/app/api/debug/realtime/route.ts) to verify:
- Authentication status
- RLS SELECT permissions
- Publication status
- Insert/read permissions

---

## SQL Verification Steps

Execute this SQL in Supabase SQL Editor:

**File:** [REALTIME_VERIFICATION_ALL_STEPS.sql](REALTIME_VERIFICATION_ALL_STEPS.sql)

This script will:
1. ✅ Verify `ai_messages` table has PRIMARY KEY on `id`
2. ✅ Set replica identity to FULL
3. ✅ Re-add table to `supabase_realtime` publication cleanly
4. ✅ Force cache reloads with NOTIFY commands
5. ✅ Verify RLS is ON and SELECT policy exists
6. ✅ Insert a test message and return its ID

---

## How to Test End-to-End

### Step 1: Run SQL Verification
```bash
# Open Supabase SQL Editor
# Paste contents of REALTIME_VERIFICATION_ALL_STEPS.sql
# Execute all statements
# Copy the message ID from the INSERT RETURNING output
```

### Step 2: Open Browser and Monitor Console
```bash
# 1. Open http://localhost:3001/coach
# 2. Open DevTools Console (Cmd+Opt+J)
# 3. Look for these logs on page load:
```

Expected logs:
```
[RT] 🔌 Initializing subscription for channel: ai_messages:<user_id>
[RT] 📡 Creating new channel: ai_messages:<user_id>
[RT] 📊 status changed: SUBSCRIBING
[RT] 📊 status changed: SUBSCRIBED
[RT] ✅ Successfully subscribed to realtime
```

### Step 3: Send Test Message
```bash
# Either:
# A) Type and send a message in the /coach UI
# B) Run the INSERT statement from Step 1 again in SQL Editor
```

Within 1-2 seconds, you should see:
```
[RT] ✉️  event: INSERT <message_id>... (user)
[RT] 📨 Triggering onInsert callback
[Chat] realtime callback received: <message_id> user
[mergeInsert] called with: 1 messages
[mergeInsert] adding: <message_id> user <content>
```

**AND** the message should appear in the UI instantly (no 8-second delay).

---

## Expected Outcomes

### ✅ Success Indicators
- [ ] SQL script executes without errors
- [ ] `relreplident = 'f'` (FULL replica identity)
- [ ] Table appears in `pg_publication_tables`
- [ ] Browser shows `[RT] ✅ Successfully subscribed`
- [ ] Test INSERT triggers `[RT] ✉️  event: INSERT` within 1 second
- [ ] Message appears in UI immediately

### ❌ Failure Indicators
- `CHANNEL_ERROR` or `TIMED_OUT` in browser console
- No `[RT] ✉️  event: INSERT` after sending message
- Messages appear only after 8-second fallback fetch

---

## Troubleshooting

### If you see `CHANNEL_ERROR`:
1. Verify `NEXT_PUBLIC_SUPABASE_URL` in [.env.local](apps/web/.env.local) is correct
2. Check Supabase Dashboard → Project Settings → API → "Enable Realtime" is ON
3. Ensure you're authenticated (refresh page)

### If subscription succeeds but no events arrive:
1. Verify table is in publication: `SELECT * FROM pg_publication_tables WHERE tablename='ai_messages'`
2. Verify replica identity is FULL: `SELECT relreplident FROM pg_class WHERE relname='ai_messages'`
3. Run NOTIFY commands again to force cache reload

### If messages appear duplicated:
1. Check console for multiple `[RT] 🔌 Initializing` logs (should be exactly 1)
2. Hard refresh browser (Cmd+Shift+R)

---

## Files Modified/Created

### Created:
- ✅ `REALTIME_VERIFICATION_ALL_STEPS.sql` - Combined SQL verification script
- ✅ `REALTIME_FIX_SUMMARY.md` - This file
- ✅ `REALTIME_DEBUG_COMPLETE.md` - Comprehensive diagnostic guide
- ✅ `apps/web/app/api/debug/realtime/route.ts` - Diagnostic endpoint

### Modified:
- ✅ `apps/web/lib/realtime.ts` - Fixed reconnection bug, added enhanced logging
- ✅ `apps/web/app/(app)/coach/page.tsx` - Added debug logging to mergeInsert

---

## Next Action Required

**Run the SQL script in Supabase SQL Editor:**
1. Open [Supabase Dashboard](https://supabase.com/dashboard)
2. Go to SQL Editor
3. Paste contents of `REALTIME_VERIFICATION_ALL_STEPS.sql`
4. Execute
5. Copy the message ID from the final INSERT RETURNING
6. Open browser to http://localhost:3001/coach
7. Check console logs for realtime events

---

## Final Status

**Code:** ✅ All fixes implemented
**SQL:** ⏳ Awaiting execution in Supabase
**Test:** ⏳ Awaiting browser verification
**Confidence:** High - Core bug fixed + comprehensive verification steps provided

---

**Date:** 2025-10-26
**Dev Server:** Running on http://localhost:3001
