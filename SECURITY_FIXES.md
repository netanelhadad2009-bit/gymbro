# Security Fixes - Supabase Linter Issues

## Overview
This document tracks the security issues identified by Supabase's database linter and the fixes applied.

## Issues Fixed

### ERROR-Level Issues ✅

#### 1. Security Definer Views
**Problem:** Two views were using SECURITY DEFINER, which enforces the view creator's permissions rather than the querying user's permissions.

**Fixed Views:**
- `v_ai_messages_rls_status`
- `v_ai_messages_policies`

**Solution:** Recreated views with `security_barrier = false` to use caller's permissions.

**Migration:** `20251124_fix_security_lints.sql`

---

#### 2. RLS Disabled on _prisma_migrations
**Problem:** The `_prisma_migrations` table was publicly accessible without Row Level Security.

**Solution:**
- Enabled RLS on the table
- Created restrictive policy that blocks all regular users (only service_role can access)

**Migration:** `20251124_fix_security_lints.sql`

---

### WARN-Level Issues ✅

#### 3. Function Search Path Mutable (25 functions)
**Problem:** Functions without an immutable `search_path` are vulnerable to search path hijacking attacks.

**Fixed Functions:**
- `update_meals_updated_at`
- `update_avatars_updated_at`
- `fn_user_current_chapter`
- `update_updated_at_column`
- `slugify_hebrew`
- `exercise_library_set_defaults`
- `set_updated_at`
- `is_user_admin`
- `update_exercise_updated_at`
- `generate_exercise_slug`
- `ai_messages_set_user_id`
- `fn_user_context`
- `get_user_avatar_details`
- `enforce_user_id_from_auth`
- `debug_ai_messages_impersonation`
- `fn_set_user_id`
- `fn_update_timestamp`
- `fn_journey_user_view`
- `update_weigh_ins_updated_at`
- `is_program_normalized`
- `get_program_stats`
- `is_owner`
- `create_default_notification_preferences`
- `app.current_user_id`

**Solution:** Added `SET search_path = public` to all functions.

**Migration:** `20251124_fix_security_lints.sql`

---

#### 4. Extension in Public Schema
**Problem:** The `pg_trgm` extension was installed in the `public` schema, which is a security concern.

**Solution:** Moved `pg_trgm` to the `extensions` schema.

**Migration:** `20251124_fix_security_lints.sql`

**Note:** If this fails during migration, it may need to be done manually via Supabase dashboard during a maintenance window.

---

## Manual Action Required ⚠️

### 5. Leaked Password Protection Disabled
**Problem:** Supabase Auth's leaked password protection is currently disabled.

**How to Fix:**
1. Go to your Supabase dashboard
2. Navigate to: **Authentication** > **Providers** > **Email**
3. Scroll to **Password Security**
4. Enable **"Check HaveIBeenPwned on sign up"**

This feature prevents users from using passwords that have been compromised in data breaches.

**Reference:** https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

---

## Applying the Fixes

### Option 1: Via Supabase CLI (Recommended)
```bash
cd /Users/netanelhadad/Projects/gymbro
supabase db push
```

### Option 2: Via Supabase Dashboard
1. Go to SQL Editor in your Supabase dashboard
2. Copy the contents of `supabase/migrations/20251124_fix_security_lints.sql`
3. Paste and run the migration

---

## Verification

After applying the migration, run these queries to verify the fixes:

### Check views are not security definer:
```sql
SELECT viewname, viewowner
FROM pg_views
WHERE schemaname = 'public' AND viewname LIKE 'v_ai%';
```

### Check RLS enabled on _prisma_migrations:
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = '_prisma_migrations';
```

### Check functions have search_path set:
```sql
SELECT
  p.proname,
  pg_get_function_identity_arguments(p.oid) as args,
  CASE
    WHEN 'search_path' = ANY(p.proconfig::text[]) THEN 'HAS search_path'
    ELSE 'MISSING search_path'
  END as search_path_status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname IN ('public', 'app')
  AND p.proname IN (
    'update_meals_updated_at',
    'is_user_admin',
    'enforce_user_id_from_auth'
  );
```

### Check pg_trgm location:
```sql
SELECT extname, nspname
FROM pg_extension e
JOIN pg_namespace n ON e.extnamespace = n.oid
WHERE extname = 'pg_trgm';
```

---

## Timeline
- **Issues Identified:** 2025-11-24
- **Migration Created:** 2025-11-24
- **Status:** Ready to apply

---

## References
- [Supabase Database Linter](https://supabase.com/docs/guides/database/database-linter)
- [Function Search Path Security](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable)
- [Security Definer Views](https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view)
- [RLS Best Practices](https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public)
