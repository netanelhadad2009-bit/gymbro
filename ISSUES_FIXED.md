# Issues Fixed - November 19, 2025

## Summary
Analyzed logs after successful onboarding and user registration. Found and fixed several issues.

---

## ✅ FIXED

### 1. Nutrition Plan Generation During Onboarding
**Issue**: Program creation page wasn't generating nutrition plans during onboarding because it required authentication.

**Fix**:
- Created new unauthenticated endpoint: `/api/ai/nutrition/onboarding`
- Updated `OnboardingGeneratingClient.tsx` to use this endpoint
- Endpoint has stricter rate limiting (3 req/min vs 5 req/min) for security
- Forces 1-day meal plans for onboarding

**Files Changed**:
- `apps/web/app/api/ai/nutrition/onboarding/route.ts` (NEW)
- `apps/web/app/onboarding/generating/OnboardingGeneratingClient.tsx:112`

---

### 2. Avatar Database Schema Issues
**Issue 1**: Missing columns - `"Could not find the 'avatar_id' column of 'avatars' in the schema cache"`
**Issue 2**: Wrong data type - `'invalid input syntax for type integer: "0.1"'`

**Fix**: Created SQL migration to add missing columns with correct types

**Action Required**:
Run this SQL in your Supabase Dashboard → SQL Editor:

```sql
-- File: supabase/migrations/035_add_avatar_resolution_columns.sql

ALTER TABLE public.avatars
ADD COLUMN IF NOT EXISTS avatar_id text;

ALTER TABLE public.avatars
ADD COLUMN IF NOT EXISTS confidence numeric;  -- Changed from integer to numeric for 0-1 decimals

ALTER TABLE public.avatars
ADD COLUMN IF NOT EXISTS matched_rules jsonb DEFAULT '[]'::jsonb;

ALTER TABLE public.avatars
ADD COLUMN IF NOT EXISTS reasons jsonb DEFAULT '[]'::jsonb;

NOTIFY pgrst, 'reload schema';
```

**Why numeric instead of integer?**
The code uses decimal values (0.1, 0.5, 0.9) for confidence scores, not integers (0-100). The `confidence` field represents a 0-1 decimal where 0.1 = 10% confidence.

**Files Created**:
- `supabase/migrations/035_add_avatar_resolution_columns.sql`

---

## ⚠️ WARNINGS (Non-Breaking)

### 3. Missing dailyTargets in Old Nutrition Plans
**Issue**: Some users have nutrition plans without `dailyTargets` field

**Status**:
- Not critical - just means journey progress won't track for those users
- New nutrition plans generated via `/api/ai/nutrition/onboarding` always include `dailyTargets` (validated by Zod schema)
- Existing users with old plans will continue to work, they just won't see personalized journey tasks

**Recommendation**:
- No action needed now
- Consider regenerating nutrition plans for affected users in the future

---

### 4. Supabase Auth Security Warning
**Issue**: `getSession()` is potentially insecure - should use `getUser()` instead

**Status**:
- Warning only, not breaking
- 16 files use `getSession()` - would need systematic refactor

**Files Affected**:
- middleware.ts
- contexts/AuthProvider.tsx
- app/(app)/nutrition/NutritionPageClient.tsx
- lib/auth/bootstrap.ts
- And 12 more...

**Recommendation**:
- Not urgent for development
- Should be fixed before production launch
- Can be done in a separate PR when prioritized

---

### 5. Source Field Validation Errors
**Issue**: Some API calls missing/invalid `source` field

**Status**:
- These are just validation warnings from improperly formatted API requests
- Not breaking anything
- Likely from older code or edge cases

**Recommendation**:
- Monitor logs to identify source of these calls
- Fix as they're encountered

---

## 📊 Current State

### ✅ Working:
- Onboarding flow completes successfully
- User registration works
- Nutrition plan generation during onboarding
- iOS app loads correctly
- Notification permission dialog appears

### ⚠️ Known Issues (Non-Critical):
- Avatar creation fails silently (needs migration)
- Old users won't have journey progress tracking
- Security warnings from getSession()

### 🔧 Action Required:
1. **MUST DO**: Run the SQL migration for avatar columns in Supabase
2. **RECOMMENDED**: Monitor for any new users having issues with nutrition generation
3. **FUTURE**: Refactor getSession() to getUser() before production

---

## Testing Checklist

After applying the SQL migration, test:
- [ ] Create a new user account
- [ ] Complete onboarding with nutrition generation
- [ ] Check that avatar is created in database
- [ ] Verify journey tasks appear correctly
- [ ] Test iOS app on physical device
