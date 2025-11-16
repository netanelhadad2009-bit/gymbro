# GymBro AI Coach - End-to-End Runbook

## Overview

This runbook provides step-by-step verification of all critical system components.

**Last Updated:** 2025-10-26
**Status:** ✅ Ready for execution

---

## Pre-Flight Checklist

- [ ] Dev server running: `pnpm --filter @gymbro/web dev`
- [ ] Logged in user session active
- [ ] Supabase project accessible

---

## 1. ENV & Secrets Audit

### Check 1A: Client-side ENV (SAFE)

```bash
grep NEXT_PUBLIC apps/web/.env.local
```

**Expected:**
```
NEXT_PUBLIC_SUPABASE_URL="https://..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbG..."
NEXT_PUBLIC_VAPID_PUBLIC_KEY="..."
NEXT_PUBLIC_WA_NUMBER="..."
NEXT_PUBLIC_LOG_CACHE=1
```

**✅ PASS Criteria:** Only `NEXT_PUBLIC_*` prefixed vars visible

### Check 1B: Server-side Secrets (SAFE)

```bash
grep -E "^(SUPABASE_SERVICE_ROLE_KEY|OPENAI_API_KEY|VAPID_PRIVATE_KEY)" apps/web/.env.local | wc -l
```

**Expected:** 3 (or more if additional secrets exist)

**✅ PASS Criteria:** Secrets exist but are NOT prefixed with `NEXT_PUBLIC_`

### Check 1C: Code Bundle Safety

```bash
# Verify server-only imports use process.env (not NEXT_PUBLIC)
grep -r "process.env.OPENAI_API_KEY" apps/web/app/api/
grep -r "process.env.SUPABASE_SERVICE_ROLE_KEY" apps/web/lib/supabase-admin.ts
```

**✅ PASS Criteria:** Both commands return matches (secrets used server-side only)

**🔒 Security Score: PASS** if all checks pass

---

## 2. Health Endpoint

### Check 2A: Health API

```bash
curl -s http://localhost:3001/api/health | jq
```

**Expected:**
```json
{
  "ok": true,
  "ts": 1730000000000
}
```

**✅ PASS Criteria:** `ok: true` with recent timestamp

### Check 2B: Headers

```bash
curl -I http://localhost:3001/api/health | grep -i cache
```

**Expected:**
```
Cache-Control: no-store, max-age=0
Pragma: no-cache
Expires: 0
```

**✅ PASS Criteria:** No-cache headers present

---

## 3. RLS (Row Level Security)

### Check 3A: Run SQL Migration

```bash
# In Supabase SQL Editor, run:
cat supabase/migrations/999_e2e_audit_fix.sql
```

Then execute in Supabase dashboard. Wait for "Success" confirmation.

### Check 3B: Verify RLS Status

```bash
curl -s http://localhost:3001/api/debug/rls | jq '.rlsStatus'
```

**Expected:**
```json
{
  "data": {
    "tablename": "ai_messages",
    "rls_enabled": true
  },
  "error": null
}
```

**✅ PASS Criteria:** `rls_enabled: true`

### Check 3C: Verify Policies Count

```bash
curl -s http://localhost:3001/api/debug/rls | jq '.policies.count'
```

**Expected:** `4` (SELECT, INSERT, UPDATE, DELETE)

**✅ PASS Criteria:** Count = 4

### Check 3D: Live App Test

```bash
curl -s http://localhost:3001/api/debug/rls | jq '.liveAppTest'
```

**Expected:**
```json
{
  "insertId": "1c696...",
  "recentRows": [...],
  "rowCount": 3,
  "error": null
}
```

**✅ PASS Criteria:** `insertId` present, `error: null`

---

## 4. Realtime Publication

### Check 4A: Publication Status

```bash
curl -s http://localhost:3001/api/debug/realtime | jq '.checks.publication'
```

**Expected:**
```json
{
  "inRealtime": true,
  "error": null
}
```

**✅ PASS Criteria:** `inRealtime: true`

### Check 4B: Replica Identity (SQL)

Run in Supabase SQL Editor:
```sql
SELECT relname, relreplident
FROM pg_class
WHERE relname IN ('ai_messages', 'meals', 'weigh_ins');
```

**Expected:**
```
 relname      | relreplident
--------------+--------------
 ai_messages  | f
 meals        | f
 weigh_ins    | f
```

**✅ PASS Criteria:** `relreplident = 'f'` (FULL)

---

## 5. Chat API Flow

### Check 5A: Self-Test (Meals)

```bash
curl -s -X POST http://localhost:3001/api/meals/self-test | jq
```

**Expected:**
```json
{
  "ok": true,
  "message": "Meals self-test passed",
  ...
}
```

**✅ PASS Criteria:** `ok: true`

### Check 5B: Self-Test (AI Coach)

```bash
curl -s -X POST http://localhost:3001/api/coach/self-test | jq
```

**Expected:**
```json
{
  "ok": true,
  "message": "AI coach self-test passed",
  ...
}
```

**✅ PASS Criteria:** `ok: true`

### Check 5C: Live Chat Request

```bash
# Note: Requires authentication cookie - test via browser
# Open browser console at http://localhost:3001/coach

# Send message via UI, check Network tab:
# POST /api/coach/chat
# Response should be:
{
  "ok": true,
  "message": "...",
  "userMessage": {...},
  "assistantMessage": {...}
}
```

**✅ PASS Criteria:**
- Response time < 3s
- Unique reply (not repeated)
- Both messages returned

---

## 6. Initial Load + Realtime

### Check 6A: Initial Fetch

Open browser console at `http://localhost:3001/coach`:

```javascript
// Should see:
[Chat] initial fetch…
[Chat] fetched: 10
```

**✅ PASS Criteria:** Messages load immediately on page load

### Check 6B: Realtime Subscription

```javascript
// Should see:
[RT] 🔌 Initializing subscription for channel: ai_messages:abc123...
[RT] 📡 Creating new channel: ai_messages:abc123
[RT] 📊 status changed: SUBSCRIBING
[RT] 📊 status changed: SUBSCRIBED
[RT] ✅ Successfully subscribed to realtime
```

**✅ PASS Criteria:** Status reaches `SUBSCRIBED`

### Check 6C: Live Message Insert

1. Type message in chat: "test message"
2. Send
3. Check console within 1-2 seconds:

```javascript
[RT] ✉️  event: INSERT 1c696... (user)
[RT] 📨 Triggering onInsert callback
[Chat] realtime callback received: 1c696... user
[mergeInsert] called with: 1 messages
// Then assistant reply:
[RT] ✉️  event: INSERT 2d7a8... (assistant)
```

**✅ PASS Criteria:**
- User message appears instantly (no 8s delay)
- Assistant message appears instantly
- Total roundtrip < 3s

---

## 7. Context & Direct Responses

### Check 7A: Direct Response (Nutrition Today)

Send via chat UI: `כמה אכלתי היום?`

Check server logs:
```
[AI Coach] Detected intent: nutrition_today (nutrition_today)
[AI Coach] Response path: direct
[AI Coach] Using direct response (no model call)
```

**✅ PASS Criteria:**
- Response path = "direct"
- No OpenAI call
- Response < 500ms

### Check 7B: Direct Response (Weight Trend)

Send via chat UI: `מה המגמה במשקל?`

Check server logs:
```
[AI Coach] Detected intent: weight_trend (weight_trend)
[AI Coach] Response path: direct
```

**✅ PASS Criteria:** Same as 7A

### Check 7C: Model Response (Free-form)

Send via chat UI: `מה אתה חושב על הדיאטה שלי?`

Check server logs:
```
[AI Coach] Detected intent: free (free)
[AI Coach] Response path: model
[AI Coach] Calling OpenAI with 5 messages, ~ 450 context tokens
[AI Coach] OpenAI response received, tokens: 1234
```

**✅ PASS Criteria:**
- Response path = "model"
- Context loaded
- Tokens counted

---

## 8. Plain Text Only

### Check 8A: Response Format

Send any question, inspect response in UI:

**❌ FAIL Examples:**
```
# כותרת
**טקסט מודגש**
- רשימה
```

**✅ PASS Examples:**
```
כותרת
טקסט רגיל
פריטים: א, ב, ג
```

**✅ PASS Criteria:** No markdown syntax visible in UI

### Check 8B: Code Inspection

```bash
grep -A 5 "removeMarkdown" apps/web/app/api/coach/chat/route.ts
```

**Expected:** Function call with `stripListLeaders: true`

---

## 9. Mobile: Dev vs Bundled

### Check 9A: Dev Mode (Capacitor)

```bash
# Set in .env.local:
CAP_DEV=1

# Build iOS:
pnpm exec cap sync ios
pnpm exec cap run ios
```

**Expected in iOS Simulator:**
- App loads dev server (http://localhost:3001)
- Hot reload works
- Network tab shows requests to localhost:3001

**✅ PASS Criteria:** Dev overlay does NOT appear (health check passes)

### Check 9B: Bundled Mode

```bash
# Unset or set to 0:
CAP_DEV=0

# Build:
pnpm build
pnpm exec cap sync ios
pnpm exec cap run ios
```

**Expected:**
- App loads instantly from bundled assets (capacitor://)
- No dev server dependency
- UI fully functional

**✅ PASS Criteria:** App works offline

---

## 10. Logging & Privacy

### Check 10A: No PII in Logs

Send message with personal info: `שמי יוסי ואני שוקל 85 קילו`

Check server logs - should see:
```
[AI Coach] Message preview: שמי יוסי ואני...  // (truncated at 120 chars)
[AI Coach] Response preview: שלום יוסי...      // (truncated at 80 chars)
```

**✅ PASS Criteria:**
- Messages truncated
- No full message content logged
- User IDs shown as `abc123...` (8 chars + ...)

### Check 10B: Toggle Logging

```bash
# Set in .env.local:
NEXT_PUBLIC_LOG_CHAT=0

# Restart dev server
# Send message
```

**Expected:** Minimal logs (no previews)

**✅ PASS Criteria:** Configurable logging works

---

## 11. Performance & Stability

### Check 11A: Chat Roundtrip Time

Send 5 messages, measure average response time:

```javascript
// In browser console:
let times = [];
// For each message, record time from send to reply visible
// Average should be:
```

**✅ PASS Criteria:**
- Direct responses: < 800ms
- Model responses: < 2.5s

### Check 11B: Realtime Latency

1. Open 2 browser tabs to `/coach`
2. Send message in Tab 1
3. Measure time until visible in Tab 2

**✅ PASS Criteria:** < 1s

### Check 11C: Fallback Refetch

1. Disable realtime (close WebSocket in DevTools)
2. Send message
3. Wait 8 seconds

**Expected:** Fallback refetch triggers, message appears

**✅ PASS Criteria:** Messages appear within 8s fallback window

---

## 12. Final PASS/FAIL Matrix

| Check | Status | Evidence |
|-------|--------|----------|
| 1A. Client ENV safe | ⏳ | `grep NEXT_PUBLIC .env.local` |
| 1B. Server secrets exist | ⏳ | 3+ lines found |
| 1C. Bundle safety | ⏳ | Server-only imports verified |
| 2A. Health API | ⏳ | `curl /api/health → ok: true` |
| 2B. No-cache headers | ⏳ | Headers confirmed |
| 3A. RLS migration run | ⏳ | SQL executed successfully |
| 3B. RLS enabled | ⏳ | `rls_enabled: true` |
| 3C. 4 policies exist | ⏳ | Count = 4 |
| 3D. Live app test | ⏳ | Insert/select works |
| 4A. Realtime publication | ⏳ | `inRealtime: true` |
| 4B. Replica identity FULL | ⏳ | `relreplident = 'f'` |
| 5A. Meals self-test | ⏳ | `ok: true` |
| 5B. Coach self-test | ⏳ | `ok: true` |
| 5C. Live chat request | ⏳ | Response < 3s, unique |
| 6A. Initial fetch works | ⏳ | Messages load on page load |
| 6B. Realtime subscribed | ⏳ | Status = SUBSCRIBED |
| 6C. Live insert instant | ⏳ | < 1s latency |
| 7A. Direct nutrition | ⏳ | No model call, < 500ms |
| 7B. Direct weight | ⏳ | No model call, < 500ms |
| 7C. Model free-form | ⏳ | Context loaded, tokens counted |
| 8A. Plain text only | ⏳ | No markdown in UI |
| 8B. removeMarkdown code | ⏳ | Function found |
| 9A. Mobile dev mode | ⏳ | Hot reload works |
| 9B. Mobile bundled | ⏳ | Works offline |
| 10A. No PII logs | ⏳ | Truncated previews only |
| 10B. Logging toggleable | ⏳ | ENV controls logs |
| 11A. Response time | ⏳ | Direct < 800ms, Model < 2.5s |
| 11B. Realtime latency | ⏳ | < 1s cross-tab |
| 11C. Fallback refetch | ⏳ | Works within 8s |

**Overall Status: ⏳ PENDING EXECUTION**

---

## Go-Live Checklist

Before deploying to production:

- [ ] All checks above show ✅ PASS
- [ ] SQL migration `999_e2e_audit_fix.sql` applied to production DB
- [ ] ENV vars configured in production environment
- [ ] Service role key NOT in client bundle (verified via build inspection)
- [ ] RLS policies tested with multiple user accounts
- [ ] Realtime working in production (test via staging first)
- [ ] Performance benchmarks met (< 3s chat, < 1s realtime)
- [ ] Error logging configured (no PII)
- [ ] Mobile app tested on physical device
- [ ] Backup plan documented (rollback steps)

---

## Troubleshooting

### Issue: "Not authenticated" errors

**Fix:**
```bash
# Check cookies:
curl -v http://localhost:3001/api/health
# Should see Set-Cookie headers

# Clear cookies and re-login
```

### Issue: "RLS SELECT blocked"

**Fix:**
```sql
-- Verify policies exist:
SELECT * FROM v_ai_messages_policies;

-- If missing, re-run:
\i supabase/migrations/999_e2e_audit_fix.sql
```

### Issue: "ai_messages NOT in supabase_realtime publication"

**Fix:**
```sql
-- Re-add to publication:
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_messages;
NOTIFY pgrst, 'reload schema';
```

### Issue: Messages not appearing in realtime

**Fix:**
1. Check browser console for `[RT] ✅ Successfully subscribed`
2. Verify replica identity: `SELECT relreplident FROM pg_class WHERE relname='ai_messages'`
3. Test insert via SQL Editor and watch browser console
4. If still failing, restart dev server

### Issue: Duplicate messages

**Fix:**
```javascript
// Hard refresh browser: Cmd+Shift+R
// Check console for multiple [RT] 🔌 Initializing logs
// Should be exactly 1 subscription per page load
```

---

## Support

- **Docs:** See `REALTIME_DEBUG_COMPLETE.md` for realtime troubleshooting
- **SQL:** See `999_e2e_audit_fix.sql` for RLS/realtime setup
- **Code:** See inline comments in `apps/web/app/api/coach/chat/route.ts`

---

**End of Runbook**
