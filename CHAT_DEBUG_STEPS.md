# Chat Messages Not Showing - Debug Steps

## Step 1: Check Browser Console

Open `/coach` and check for these logs in order:

### Expected Logs (in order):
```
[Chat] initial fetch…
[Chat] fetched: X
[mergeInsert] called with: X messages
[mergeInsert] final count: X
[Chat] subscribing realtime for <user-id>
[RT] status: SUBSCRIBED
```

### If you see these logs, the setup is correct. If not:

**Missing `[Chat] initial fetch…`?**
- User is not authenticated. Check if `userId` is null.

**Missing `[RT] status: SUBSCRIBED`?**
- Realtime is not connecting. Check Supabase project settings.

## Step 2: Send a Test Message

Type "test" and send.

### Expected Logs:
```
[send] 2025-10-26T... 4
```

Then wait 1-2 seconds. You should see:

```
[RT] event: INSERT <msg-id-1>
[Chat] realtime callback received: <msg-id-1> user
[mergeInsert] called with: 1 messages
[mergeInsert] adding: <msg-id-1> user test
[mergeInsert] final count: X+1

[RT] event: INSERT <msg-id-2>
[Chat] realtime callback received: <msg-id-2> assistant
[mergeInsert] called with: 1 messages
[mergeInsert] adding: <msg-id-2> assistant <response>
[mergeInsert] final count: X+2
```

### If you DON'T see `[RT] event: INSERT`:

**Option A: Realtime is not configured**

Run this SQL in Supabase:
```sql
SELECT * FROM pg_publication_tables
WHERE pubname='supabase_realtime' AND tablename='ai_messages';
```

If it returns **0 rows**, run:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_messages;
```

**Option B: Messages ARE inserting but realtime isn't working**

Check server logs (where you ran `npm run dev`). You should see:
```
[AI Coach] User message inserted
[AI Coach] Assistant reply inserted
```

If you see those, messages are in the database. Check browser console for WebSocket errors.

## Step 3: Check Fallback Refetch

If realtime is broken, the fallback should kick in after 8 seconds:

```
[Chat] fallback refetch (no realtime for 8s)
[Chat] fallback fetched: X
[mergeInsert] called with: X messages
```

If you see this, messages will appear but with an 8 second delay.

## Step 4: Direct Database Check

Run this in Supabase SQL Editor (replace YOUR_USER_ID):

```sql
SELECT id, role, content, created_at
FROM ai_messages
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC
LIMIT 10;
```

**If messages are there** → Realtime or frontend issue
**If messages are NOT there** → API/database issue

## Step 5: Check API Response

In Network tab, find the `POST /api/coach/chat` request.

Check the response:
```json
{
  "ok": true,
  "message": "...",
  "userMessage": { "id": "...", "role": "user", ... },
  "assistantMessage": { "id": "...", "role": "assistant", ... }
}
```

If `ok: false`, check the error message.

## Step 6: Force Refetch Manually

In browser console, run:

```javascript
fetch('/api/coach/messages').then(r => r.json()).then(console.log)
```

You should see:
```json
{
  "ok": true,
  "messages": [
    { "id": "...", "role": "user", "content": "test", "created_at": "..." },
    { "id": "...", "role": "assistant", "content": "...", "created_at": "..." }
  ]
}
```

If messages are there but not showing in UI, there's a React state issue.

## Quick Fix Commands

### 1. Ensure Realtime Publication

```sql
-- Run in Supabase SQL Editor
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname='public' AND tablename='ai_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_messages;
    RAISE NOTICE 'Added ai_messages to realtime';
  ELSE
    RAISE NOTICE 'Already in realtime';
  END IF;
END $$;
```

### 2. Force Page Refresh

Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)

### 3. Clear Browser State

```javascript
// In browser console
localStorage.clear();
sessionStorage.clear();
location.reload();
```

## Common Issues & Solutions

### Issue: `[RT] status: CHANNEL_ERROR`

**Solution:** Supabase realtime is not enabled or project URL is wrong.
- Check `.env.local` has correct `NEXT_PUBLIC_SUPABASE_URL`
- Check Supabase project settings → API → Realtime is enabled

### Issue: Messages show after 8 seconds

**Solution:** Realtime is broken, fallback is working.
- Run publication SQL above
- Restart dev server
- Hard refresh browser

### Issue: `Cannot find name 'Msg'` TypeScript error

**Solution:** Already fixed in latest code. Pull latest changes.

### Issue: Duplicate messages

**Solution:** Should not happen with `mergeInsert`. If it does:
- Check if you have multiple subscriptions
- Check console for multiple `[Chat] subscribing realtime` logs

### Issue: No logs at all

**Solution:**
1. Open DevTools console
2. Check "Preserve log" is enabled
3. Refresh page
4. Check for any errors in red

## What to Send Me

If still broken, send me:

1. **All console logs** from page load to after sending a message
2. **Server logs** (from `npm run dev` terminal)
3. **SQL query result:**
   ```sql
   SELECT * FROM pg_publication_tables WHERE tablename='ai_messages';
   ```
4. **Network tab** - screenshot of `/api/coach/chat` response

---

## Next: Try This Now

1. Open `/coach`
2. Open DevTools console
3. Send message "test"
4. Copy ALL console logs
5. Send them to me

I'll tell you exactly what's wrong!
