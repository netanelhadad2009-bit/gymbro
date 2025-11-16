# GymBro AI Coach - Quick Start (E2E Audit)

**🎯 Goal:** Verify all systems working end-to-end in 5 minutes.

---

## Step 1: Run SQL Migration (2 min)

### Copy this SQL and run in [Supabase SQL Editor](https://supabase.com/dashboard):

```bash
# Open file:
cat supabase/migrations/999_e2e_audit_fix.sql

# Or copy directly from:
open supabase/migrations/999_e2e_audit_fix.sql
```

**Expected:** "Success" message after ~5 seconds.

**What it does:**
- ✅ Enables RLS on all tables
- ✅ Creates 4 policies per table (SELECT/INSERT/UPDATE/DELETE)
- ✅ Adds defense-in-depth triggers
- ✅ Sets up realtime publication
- ✅ Creates diagnostic views

---

## Step 2: Verify Health (30 sec)

```bash
# Should return: {"ok":true,"ts":...}
curl -s http://localhost:3001/api/health | jq
```

✅ PASS if `ok: true`

---

## Step 3: Verify RLS (30 sec)

**Note:** Requires logged-in user session. If not logged in, login first at http://localhost:3001

```bash
# Should return: ok: true, policies.count: 4
curl -s http://localhost:3001/api/debug/rls | jq '.ok, .policies.count'
```

✅ PASS if `true` and `4`

---

## Step 4: Verify Realtime Setup (30 sec)

```bash
# Should return: ok: true, checks.publication.inRealtime: true
curl -s http://localhost:3001/api/debug/realtime | jq '.ok, .checks.publication.inRealtime'
```

✅ PASS if `true` and `true`

---

## Step 5: Live Chat Test (1 min)

1. Open http://localhost:3001/coach
2. Open DevTools Console (Cmd+Opt+J / F12)
3. Send message: "היי"
4. Watch for these logs within 2 seconds:

```
[RT] ✉️  event: INSERT abc123... (user)
[RT] 📨 Triggering onInsert callback
[Chat] realtime callback received: abc123... user
// Then assistant reply:
[RT] ✉️  event: INSERT def456... (assistant)
```

✅ PASS if:
- Messages appear instantly (no 8-second delay)
- Both user and assistant messages trigger realtime events
- Total roundtrip < 3 seconds

---

## Step 6: Direct Response Test (30 sec)

Send in chat: `כמה אכלתי היום?`

Watch **server logs** (terminal running dev server):

```
[AI Coach] Detected intent: nutrition_today (nutrition_today)
[AI Coach] Response path: direct
[AI Coach] Using direct response (no model call)
```

✅ PASS if:
- Response path = "direct"
- No "Calling OpenAI" log
- Response < 500ms

---

## Done! 🎉

**All 6 checks passed?** You're ready for production.

**Any failures?** See troubleshooting below.

---

## Troubleshooting

### "Not authenticated"
```bash
# Solution: Login first
open http://localhost:3001
# Login, then retry tests
```

### "Could not find table v_ai_messages_rls_status"
```bash
# Solution: SQL migration not applied yet
# Go back to Step 1
```

### "ai_messages NOT in supabase_realtime publication"
```sql
-- Run in Supabase SQL Editor:
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_messages;
NOTIFY pgrst, 'reload schema';
```

### Messages not appearing in realtime
```javascript
// Check browser console for:
[RT] 📊 status changed: SUBSCRIBED  // ✅ Good
[RT] ❌ subscription error: ...     // ❌ Problem

// If CHANNEL_ERROR:
// 1. Verify NEXT_PUBLIC_SUPABASE_URL in .env.local
// 2. Check Supabase Dashboard → Settings → API → "Enable Realtime" is ON
// 3. Hard refresh browser (Cmd+Shift+R)
```

### Duplicate messages
```javascript
// Hard refresh: Cmd+Shift+R
// Should see exactly 1 log: [RT] 🔌 Initializing subscription
// If multiple, check for multiple useEffect calls in coach/page.tsx
```

---

## Full Documentation

For comprehensive testing and troubleshooting:
- **E2E_RUNBOOK.md** - Complete test suite with all commands
- **E2E_AUDIT_RESULTS.md** - Detailed audit findings
- **REALTIME_DEBUG_COMPLETE.md** - Realtime troubleshooting guide

---

## Production Checklist

Before deploying:

- [ ] All 6 quick checks above show ✅ PASS
- [ ] SQL migration applied to production database
- [ ] ENV vars configured in production
- [ ] Tested with 2+ user accounts (verify isolation)
- [ ] Performance benchmarked (< 3s chat, < 1s realtime)
- [ ] Error monitoring configured (Sentry, etc.)
- [ ] Mobile app tested on physical device
- [ ] Backup/rollback plan documented

---

**Last Updated:** 2025-10-26
**Status:** ✅ Ready for Testing
