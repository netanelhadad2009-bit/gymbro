# 🔍 Realtime Debugging - Complete Diagnostic

## Problem Identified

**Messages insert successfully but don't appear in UI immediately** - they only show after 8 seconds (fallback fetch).

## Root Causes Found

### 1. **Realtime Reconnection Bug** ✅ FIXED
**File:** `lib/realtime.ts`

**Issue:** When the realtime connection errored, the reconnection logic called `subscribeMessagesForUser()` recursively, but the new subscription's cleanup function was never stored, causing it to be lost.

**Fix:** Rewrote with proper state management:
- Single `currentChannel` reference
- Proper cleanup flag (`isCleanedUp`)
- Reconnection doesn't create orphaned subscriptions
- Added emojis for easy log scanning

### 2. **Missing Diagnostic Tooling** ✅ ADDED
**File:** `app/api/debug/realtime/route.ts`

**Added:** Self-diagnostic endpoint that checks:
- Authentication status
- RLS SELECT permissions
- Publication status
- Insert/read permissions
- Generates recommendations

---

## What Was Fixed

### File: `lib/realtime.ts`

**Before:**
```typescript
// BUG: Recursive call creates new subscription but cleanup function is lost
subscribeMessagesForUser(userId, onInsert); // ❌ No cleanup stored
```

**After:**
```typescript
// ✅ Proper reconnection with state management
const createSubscription = () => {
  if (isCleanedUp) return;
  if (currentChannel) supabase.removeChannel(currentChannel);
  // ... create new subscription
  currentChannel = chan;
};
```

### Enhanced Logging

**New log format:**
```
[RT] 🔌 Initializing subscription for channel: ai_messages:user-123
[RT] 📡 Creating new channel: ai_messages:user-123
[RT] 📊 status changed: SUBSCRIBED
[RT] ✅ Successfully subscribed to realtime
[RT] ✉️  event: INSERT abc12345... (user)
[RT] 📨 Triggering onInsert callback
```

**Emoji Legend:**
- 🔌 = Initialization
- 📡 = Channel creation
- 📊 = Status change
- ✅ = Success
- ✉️ = Event received
- 📨 = Callback triggered
- ⚠️ = Warning/error
- 🔄 = Reconnecting
- 🛑 = Cleanup
- 🧹 = Removing channel

---

## How to Test

### Step 1: Run Diagnostic Endpoint

```bash
# In browser or curl
curl http://localhost:3000/api/debug/realtime
```

**Expected response:**
```json
{
  "ok": true,
  "checks": {
    "auth": { "authenticated": true, "userId": "35520c8d..." },
    "rls_select": { "canSelect": true },
    "publication": { "inRealtime": true },
    "insert": { "success": true }
  },
  "recommendations": [
    "All server checks pass. Check browser console for WebSocket errors."
  ]
}
```

### Step 2: Test in Browser

1. **Open `/coach`**
2. **Open DevTools Console**
3. **Look for these logs:**

```
[RT] 🔌 Initializing subscription for channel: ai_messages:35520c8d...
[RT] 📡 Creating new channel: ai_messages:35520c8d...
[RT] 📊 status changed: SUBSCRIBING
[RT] 📊 status changed: SUBSCRIBED
[RT] ✅ Successfully subscribed to realtime
```

4. **Send a message "test"**

5. **Within 1-2 seconds, you should see:**

```
[send] 2025-10-26T... 4
[RT] ✉️  event: INSERT abc12345... (user)
[RT] 📨 Triggering onInsert callback
[Chat] realtime callback received: abc12345... user
[mergeInsert] called with: 1 messages
[mergeInsert] adding: abc12345... user test
[mergeInsert] final count: 6

[RT] ✉️  event: INSERT def67890... (assistant)
[RT] 📨 Triggering onInsert callback
[Chat] realtime callback received: def67890... assistant
[mergeInsert] called with: 1 messages
[mergeInsert] adding: def67890... assistant ...
[mergeInsert] final count: 7
```

### Step 3: Verify RLS Policies

Run this SQL in Supabase:

```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'ai_messages';
-- Expected: rowsecurity = true

-- Check SELECT policy exists
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'ai_messages' AND cmd = 'SELECT';
-- Expected: At least 1 row with qual containing 'auth.uid()'

-- Check publication
SELECT * FROM pg_publication_tables
WHERE pubname='supabase_realtime' AND tablename='ai_messages';
-- Expected: 1 row
```

---

## Common Issues & Solutions

### Issue: `[RT] 📊 status changed: CHANNEL_ERROR`

**Cause:** Realtime not enabled in Supabase project or wrong URL

**Fix:**
1. Go to Supabase Dashboard → Project Settings → API
2. Ensure "Enable Realtime" is ON
3. Verify `NEXT_PUBLIC_SUPABASE_URL` in `.env.local` is correct

### Issue: `[RT] ✅ Successfully subscribed` but no `[RT] ✉️  event: INSERT`

**Cause:** Table not in publication

**Fix:**
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_messages;
```

### Issue: Messages appear but duplicated

**Cause:** Multiple subscriptions or mergeInsert not deduping

**Check:** Count how many times you see `[RT] 🔌 Initializing` - should be exactly 1

**Fix:** Hard refresh browser (`Cmd+Shift+R`)

### Issue: `[RT] ❌ subscription error: ...`

**Cause:** RLS policy blocking realtime

**Fix:** Verify RLS SELECT policy:
```sql
-- Should have a policy like:
CREATE POLICY "Users can view own AI messages"
  ON ai_messages FOR SELECT
  USING (auth.uid() = user_id);
```

---

## Diagnostic Checklist

Run through this list:

- [ ] `/api/debug/realtime` returns `ok: true`
- [ ] Browser console shows `[RT] ✅ Successfully subscribed`
- [ ] Sending message triggers `[RT] ✉️  event: INSERT`
- [ ] `[mergeInsert]` is called within 1 second of send
- [ ] Message appears in UI immediately
- [ ] No `CHANNEL_ERROR` or timeout errors

If all checked, realtime is working correctly!

---

## Files Modified

### Created:
- ✅ `app/api/debug/realtime/route.ts` - Diagnostic endpoint
- ✅ `REALTIME_DEBUG_COMPLETE.md` - This file

### Modified:
- ✅ `lib/realtime.ts` - Fixed reconnection bug, added enhanced logging
- ✅ `lib/realtime-old.ts` - Backup of old version

### Unchanged (already correct):
- ✅ `lib/supabase.ts` - Using anon key correctly
- ✅ `app/(app)/coach/page.tsx` - Subscription logic correct
- ✅ `.env.local` - Correct Supabase URL and keys

---

## Next Steps

### 1. Restart Dev Server
```bash
# Kill current server
npm run dev
```

### 2. Test Diagnostic Endpoint
```bash
curl http://localhost:3000/api/debug/realtime
```

### 3. Open /coach and Send Message

**What you should see:**
```
[RT] 🔌 Initializing...
[RT] ✅ Successfully subscribed
[send] ...
[RT] ✉️  event: INSERT ... (user)
[RT] ✉️  event: INSERT ... (assistant)
```

### 4. If Still Not Working

**Copy and send me:**
1. Full browser console output (from page load to after sending message)
2. Output of `curl http://localhost:3000/api/debug/realtime`
3. Server logs (from `npm run dev` terminal)

---

## Technical Details

### Why the Old Code Failed

```typescript
// OLD CODE (BROKEN)
.subscribe((status) => {
  if (status === "CHANNEL_ERROR") {
    setTimeout(() => {
      supabase.removeChannel(chan);
      subscribeMessagesForUser(userId, onInsert); // ❌ New subscription orphaned
    }, backoff);
  }
});
```

**Problem:** When reconnecting, the new call to `subscribeMessagesForUser()` creates a new subscription and returns a new cleanup function. But this cleanup function is created inside the `setTimeout` and never returned to the caller. So when the component unmounts, only the FIRST subscription gets cleaned up, leaving orphaned subscriptions.

### How the New Code Fixes It

```typescript
// NEW CODE (FIXED)
let currentChannel: RealtimeChannel | null = null;

const createSubscription = () => {
  if (currentChannel) supabase.removeChannel(currentChannel); // Clean old
  const chan = supabase.channel(...).subscribe(...);
  currentChannel = chan; // Store reference
};

return () => {
  if (currentChannel) supabase.removeChannel(currentChannel); // Always cleans current
};
```

**Solution:** Single `currentChannel` reference that's always updated when reconnecting. The cleanup function always references the latest channel.

---

## Success Criteria

✅ Messages appear **instantly** (< 1 second)
✅ No 8-second delay (fallback not needed)
✅ Logs show `[RT] ✉️  event: INSERT` immediately after send
✅ Multiple tabs sync in real-time
✅ Reconnection works after network issues

---

**Status:** 🎯 Ready for Testing
**Date:** 2025-10-26
**Confidence:** High - Core bug fixed + enhanced logging + diagnostic tool added
