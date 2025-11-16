# 🔬 RLS Diagnostic System

Complete diagnostic tool for validating Row Level Security (RLS) policies on the `ai_messages` table.

---

## 📋 Overview

This diagnostic system confirms that:
1. ✅ RLS is enabled on `public.ai_messages`
2. ✅ All 4 policies exist (SELECT/INSERT/UPDATE/DELETE)
3. ✅ Policies enforce `auth.uid() = user_id` (owner-only access)
4. ✅ Impersonation test proves isolation
5. ✅ Live app test confirms current user can insert/select

---

## 🚀 Quick Start

### Step 1: Run the Diagnostic Migration

Open Supabase SQL Editor:
```
https://supabase.com/dashboard/project/ivzltlqsjrikffssyvbr/sql/new
```

Copy and run: [supabase/migrations/015_rls_diagnostics.sql](supabase/migrations/015_rls_diagnostics.sql)

```sql
-- 015_rls_diagnostics.sql
-- Creates diagnostic views and functions

-- View: RLS status on ai_messages
CREATE OR REPLACE VIEW public.v_ai_messages_rls_status AS
SELECT
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'ai_messages';

-- View: policies on ai_messages
CREATE OR REPLACE VIEW public.v_ai_messages_policies AS
SELECT
  policyname,
  cmd,
  qual::text AS using_expr,
  with_check::text AS with_check_expr
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'ai_messages'
ORDER BY cmd, policyname;

-- Function: impersonation test (counts only)
CREATE OR REPLACE FUNCTION public.debug_ai_messages_impersonation(_user_id uuid)
RETURNS TABLE (seen_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('role', 'anon', true);
  PERFORM set_config('request.jwt.claim.sub', _user_id::text, true);
  RETURN QUERY SELECT count(*)::bigint FROM public.ai_messages;
END;
$$;

NOTIFY pgrst, 'reload schema';
```

Expected: ✅ "Success. No rows returned"

---

### Step 2: Start Dev Server

```bash
cd /Users/netanelhadad/Projects/gymbro
pnpm -C apps/web dev
```

Server should be running on `http://localhost:3000`

---

### Step 3: Run the Diagnostic

**Option A: Browser**

While logged in, visit:
```
http://localhost:3000/api/debug/rls
```

**Option B: Command Line**

```bash
pnpm doctor:rls
```

**Option C: Manual fetch (browser console)**

```javascript
fetch("/api/debug/rls")
  .then(r => r.json())
  .then(j => console.log(JSON.stringify(j, null, 2)))
```

---

## 📊 Understanding the Output

### Expected Successful Response

```json
{
  "ok": true,
  "timestamp": "2025-01-25T10:30:00.000Z",
  "currentUser": {
    "id": "12345678-1234-1234-1234-123456789abc",
    "email": "user@example.com"
  },
  "rlsStatus": {
    "data": {
      "table_name": "ai_messages",
      "rls_enabled": true,
      "rls_forced": false
    },
    "error": null
  },
  "policies": {
    "data": [
      {
        "policyname": "ai_messages_delete_own",
        "cmd": "DELETE",
        "using_expr": "(auth.uid() = user_id)",
        "with_check_expr": null
      },
      {
        "policyname": "ai_messages_insert_self",
        "cmd": "INSERT",
        "using_expr": null,
        "with_check_expr": "(auth.uid() = user_id)"
      },
      {
        "policyname": "ai_messages_select_own",
        "cmd": "SELECT",
        "using_expr": "(auth.uid() = user_id)",
        "with_check_expr": null
      },
      {
        "policyname": "ai_messages_update_own",
        "cmd": "UPDATE",
        "using_expr": "(auth.uid() = user_id)",
        "with_check_expr": "(auth.uid() = user_id)"
      }
    ],
    "count": 4,
    "error": null
  },
  "impersonation": {
    "user_id": "12345678-1234-1234-1234-123456789abc",
    "seen_count": 5,
    "error": null
  },
  "liveAppTest": {
    "insertId": "abcdef12-3456-7890-abcd-ef1234567890",
    "recentRows": [
      {
        "id": "abcdef12-3456-7890-abcd-ef1234567890",
        "role": "user",
        "content": "__diagnostic__",
        "created_at": "2025-01-25T10:30:00.000Z"
      }
    ],
    "rowCount": 1,
    "error": null
  }
}
```

---

### ✅ What to Verify

#### 1. RLS Status
```json
"rlsStatus": {
  "data": {
    "rls_enabled": true  // ← MUST BE TRUE
  }
}
```

#### 2. All 4 Policies Exist
```json
"policies": {
  "count": 4,  // ← MUST BE 4
  "data": [
    { "policyname": "ai_messages_delete_own", "cmd": "DELETE" },
    { "policyname": "ai_messages_insert_self", "cmd": "INSERT" },
    { "policyname": "ai_messages_select_own", "cmd": "SELECT" },
    { "policyname": "ai_messages_update_own", "cmd": "UPDATE" }
  ]
}
```

#### 3. Policies Enforce auth.uid() = user_id
All policies should contain: `(auth.uid() = user_id)` in either `using_expr` or `with_check_expr`

#### 4. Impersonation Test
```json
"impersonation": {
  "seen_count": 5,  // ← Number of YOUR messages (should match your data)
  "error": null
}
```

#### 5. Live App Test
```json
"liveAppTest": {
  "insertId": "...",  // ← Non-null = insert worked
  "rowCount": 1,      // ← Can read your own rows
  "error": null       // ← No errors
}
```

---

## 🔧 Troubleshooting

### Problem: `rls_enabled: false`

**Fix:** Run migration 013 or 016:

```bash
# Open Supabase SQL editor and run:
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
```

---

### Problem: `policies.count: 0` or `< 4`

**Fix:** Run auto-fix migration 016:

```sql
-- Run in Supabase SQL editor
-- File: supabase/migrations/016_fix_ai_messages_policies.sql
```

Or copy from: [supabase/migrations/016_fix_ai_messages_policies.sql](supabase/migrations/016_fix_ai_messages_policies.sql)

---

### Problem: `currentUser: null`

**Cause:** You're not logged in

**Fix:**
1. Log in to your app
2. Run the diagnostic again while logged in
3. Verify cookies are being set (check DevTools → Application → Cookies)

---

### Problem: `liveAppTest.error.stage: "insert"`

**Common Errors:**

#### Error: "new row violates row-level security policy"
- **Cause:** INSERT policy missing or incorrect
- **Fix:** Run migration 016

#### Error: "Could not find the 'profile_snapshot' column"
- **Cause:** Schema cache out of sync
- **Fix:** Run migration 014, then:
```sql
NOTIFY pgrst, 'reload schema';
```

---

### Problem: Impersonation test fails

**Error:** `"error": { "message": "function does not exist" }`

**Fix:** Re-run migration 015 to create the function

---

### Problem: `ok: false, error: "Disabled in production"`

**Cause:** Diagnostic is production-disabled (by design)

**Note:** This is a security feature. The endpoint only works in development.

---

## 🔒 Security Notes

### Why This Is Safe

1. **Production Disabled:** Route returns 403 in production
2. **Read-Only Metadata:** Admin client only reads policy definitions (no user data)
3. **Impersonation Isolated:** Function returns counts only, no message content
4. **User Data via RLS:** Live test uses cookie-auth client (respects RLS)

### Service Role Key

The admin client uses `SUPABASE_SERVICE_ROLE_KEY` which:
- ✅ Bypasses RLS for diagnostic views
- ✅ Never exposed to client
- ✅ Only used server-side
- ✅ Required for metadata queries

---

## 📁 Files Created

| File | Purpose |
|------|---------|
| `supabase/migrations/015_rls_diagnostics.sql` | Diagnostic views and impersonation function |
| `supabase/migrations/016_fix_ai_messages_policies.sql` | Auto-fix for missing RLS policies |
| `apps/web/lib/supabase-admin.ts` | Admin client helper (service role) |
| `apps/web/app/api/debug/rls/route.ts` | Diagnostic endpoint (dev-only) |
| `package.json` | Added `doctor:rls` and `migrate:rls:diag` scripts |

---

## 🎯 Acceptance Criteria

Run the diagnostic and verify:

- [x] `ok: true`
- [x] `rlsStatus.data.rls_enabled: true`
- [x] `policies.count: 4`
- [x] All policies contain `auth.uid() = user_id`
- [x] `impersonation.seen_count` matches your message count
- [x] `liveAppTest.insertId` is non-null
- [x] `liveAppTest.error: null`
- [x] Returns 403 in production

---

## 🧹 Cleanup (Optional)

To remove diagnostic tools:

```sql
-- In Supabase SQL editor:
DROP VIEW IF EXISTS public.v_ai_messages_rls_status;
DROP VIEW IF EXISTS public.v_ai_messages_policies;
DROP FUNCTION IF EXISTS public.debug_ai_messages_impersonation(uuid);
```

Delete files:
- `apps/web/app/api/debug/rls/route.ts`
- `apps/web/lib/supabase-admin.ts` (if not used elsewhere)

Remove scripts from `package.json`:
- `doctor:rls`
- `migrate:rls:diag`

---

## 📞 Support

If diagnostic shows failures:
1. Check server logs (terminal)
2. Check browser console
3. Verify you're logged in
4. Run migrations in order (013 → 014 → 015 → 016 if needed)
5. Restart dev server after migrations

---

## 🎓 How It Works

### Architecture

```
┌─────────────────────────────────────────────┐
│  Browser (Logged-in User)                   │
│  fetch("/api/debug/rls")                   │
└──────────────────┬──────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────┐
│  API Route: /api/debug/rls                  │
│  - Gets current user (cookie auth)          │
│  - Uses admin client for metadata           │
│  - Uses user client for live test           │
└──────────────────┬──────────────────────────┘
                   │
        ┌──────────┴──────────┐
        ↓                     ↓
┌──────────────────┐  ┌──────────────────┐
│  Admin Client    │  │  User Client     │
│  (Service Role)  │  │  (Cookie Auth)   │
│                  │  │                  │
│  - Read views    │  │  - INSERT test   │
│  - Read policies │  │  - SELECT test   │
│  - Call RPC      │  │  (respects RLS)  │
└──────────────────┘  └──────────────────┘
        │                     │
        └──────────┬──────────┘
                   ↓
┌─────────────────────────────────────────────┐
│  Supabase Database                          │
│  - v_ai_messages_rls_status (view)         │
│  - v_ai_messages_policies (view)           │
│  - debug_ai_messages_impersonation (fn)    │
│  - ai_messages (table with RLS)            │
└─────────────────────────────────────────────┘
```

### What Gets Tested

1. **Metadata Check** (admin client)
   - Is RLS enabled?
   - Do policies exist?
   - What are the policy expressions?

2. **Impersonation Test** (admin client → RPC → anon role)
   - Set `request.jwt.claim.sub` to user ID
   - Count visible rows
   - Should see only user's own rows

3. **Live App Test** (user client with cookies)
   - INSERT new row
   - SELECT recent rows
   - Should succeed if RLS correct

---

## ✨ Summary

The RLS diagnostic system provides comprehensive validation that:
- RLS is properly configured
- Policies enforce owner-only access
- Live tests confirm expected behavior
- All operations are safe and production-ready

Run `pnpm doctor:rls` anytime to verify your RLS setup!
