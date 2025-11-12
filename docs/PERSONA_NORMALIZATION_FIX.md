# Persona Normalization Fix

**Issue:** Avatar creation was failing with CHECK constraint violations when onboarding sent non-canonical experience values like `"results"`.

**Error:** `PGRST204 / 23514 violates check constraint "avatars_experience_check"`

**Solution:** Two-layer protection system

---

## 🛡️ **Protection Layers**

### Layer 1: Code-Side Normalization (Primary)

**Purpose:** Automatically map variations to canonical values

**Implementation:** `apps/web/lib/persona/normalize.ts`

**Functions:**
- `normalizeExperience()` - Maps "results" → "knowledge", "novice" → "beginner", etc.
- `normalizeFrequency()` - Maps "moderate" → "medium", "rare" → "low", etc.
- `normalizeDiet()` - Maps "plant_based" → "vegan", "ketogenic" → "keto", etc.
- `normalizeGoal()` - Maps "weight_loss" → "loss", "gain" → "bulk", etc.
- `normalizeGender()` - Maps "f" → "female", "m" → "male", etc.
- `normalizePersona()` - Normalizes all attributes at once

**Integration Points:**
1. `apps/web/app/signup/SignupClient.tsx` - During avatar creation
2. `apps/web/lib/journey/builder.ts` - In `derivePersonaFromMetadata()` fallback

**Example:**
```typescript
import { normalizePersona } from '@/lib/persona/normalize';

const rawPersona = {
  gender: 'f',
  goal: 'weight_loss',
  diet: 'plant_based',
  frequency: 'moderate',
  experience: 'results',  // ← Would cause error without normalization
};

const normalized = normalizePersona(rawPersona);
// {
//   gender: 'female',
//   goal: 'loss',
//   diet: 'vegan',
//   frequency: 'medium',
//   experience: 'knowledge'  // ← Mapped to canonical value
// }
```

### Layer 2: Relaxed CHECK Constraint (Safety Net)

**Purpose:** Allow edge case values in database (won't reject inserts)

**Implementation:** `supabase/migrations/20251103_update_avatars_experience_check.sql`

**Changes:**
```sql
-- Before: Only canonical values
CHECK (experience IN ('beginner','intermediate','advanced','knowledge','time'))

-- After: Includes 'results' as valid value
CHECK (experience IN ('beginner','intermediate','advanced','knowledge','time','results'))
```

**Why It's Still Needed:**
- Protects against bypassed normalization
- Supports legacy data
- Allows manual database operations
- Prevents hard failures

---

## 📝 **Normalization Mappings**

### Experience
| Input | Output | Reason |
|-------|--------|--------|
| `"results"` | `"knowledge"` | Focusing on outcomes → knowledge-based |
| `"outcomes"` | `"knowledge"` | Same as above |
| `"novice"` | `"beginner"` | Synonym |
| `"newbie"` | `"beginner"` | Synonym |
| `"expert"` | `"advanced"` | Synonym |
| `"busy"` | `"time"` | Time-constrained user |
| `undefined` | `"beginner"` | Safe default |

### Frequency
| Input | Output | Reason |
|-------|--------|--------|
| `"rare"` | `"low"` | Synonym |
| `"moderate"` | `"medium"` | Synonym |
| `"frequent"` | `"high"` | Synonym |
| `"1"` or `"2"` | `"low"` | Days per week |
| `"3"` or `"4"` | `"medium"` | Days per week |
| `"5+"` | `"high"` | Days per week |

### Diet
| Input | Output | Reason |
|-------|--------|--------|
| `"plant_based"` | `"vegan"` | Common variation |
| `"ketogenic"` | `"keto"` | Full name → short |
| `"veggie"` | `"vegetarian"` | Common shorthand |
| `"normal"` | `"balanced"` | Default diet style |

### Goal
| Input | Output | Reason |
|-------|--------|--------|
| `"weight_loss"` | `"loss"` | Verbose → concise |
| `"gain"` | `"bulk"` | Synonym |
| `"tone"` | `"recomp"` | Body recomposition |

---

## 🔍 **Expected Logs**

### Success Flow (with normalization)

```bash
[Signup] Raw persona from metadata/profile: {
  gender: 'male',
  goal: 'weight_loss',
  diet: 'plant_based',
  frequency: 'moderate',
  experience: 'results'
}

[Normalize] Unknown experience "results", defaulting to "knowledge"
# ↑ Warn log from normalizer (optional)

[Signup] ensureAvatar normalized persona: {
  gender: 'male',
  goal: 'loss',
  diet: 'vegan',
  frequency: 'medium',
  experience: 'knowledge'
}

[Signup] ensureAvatar created avatar row: 9df0ca44
```

### Error Flow (before fix)

```bash
[Signup] Creating avatar with persona: {
  experience: 'results'  // ← Not in CHECK constraint
}

[Signup] Failed to insert avatar: {
  code: '23514',
  message: 'new row for relation "avatars" violates check constraint "avatars_experience_check"',
  details: 'Failing row contains (..., results, ...)',
  hint: null
}

❌ Avatar creation failed
```

---

## 🧪 **Testing**

### Run Verification Script

```bash
pnpm --filter @gymbro/web exec tsx scripts/verify-persona-normalization.ts
```

**Expected Output:**
```
🧪 Testing Persona Normalization
================================================================================
✅ PASS | experience   | "results"            → knowledge
✅ PASS | experience   | "novice"             → beginner
✅ PASS | frequency    | "moderate"           → medium
✅ PASS | diet         | "plant_based"        → vegan
...

Results: 20 passed, 0 failed

🧪 Testing Avatar Creation with Edge Cases
================================================================================
Testing: Edge Case: "results" experience
Raw persona: { gender: 'male', goal: 'cut', diet: 'keto', frequency: 'high', experience: 'results' }
Normalized: { gender: 'male', goal: 'cut', diet: 'keto', frequency: 'high', experience: 'knowledge' }
Journey nodes: 7
✅ PASS: Avatar created successfully

FINAL RESULTS
================================================================================
✅ ALL TESTS PASSED

✓ Normalization functions work correctly
✓ Edge case values (like "results") are handled
✓ Avatar creation succeeds with normalized values
✓ Journey generation works with all personas
```

### Manual Test

1. **Start dev server:**
   ```bash
   pnpm --filter @gymbro/web dev
   ```

2. **Sign up with edge case values:**
   - Complete onboarding
   - Watch terminal for normalization logs

3. **Verify success:**
   - Avatar created: `[Signup] ensureAvatar created avatar row`
   - Journey loads: Navigate to `/journey`
   - Persona-specific nodes appear (not seed nodes)

---

## 🚀 **Deployment**

### 1. Apply Code Changes (Already Done)
- ✅ `lib/persona/normalize.ts` - Normalization functions
- ✅ `app/signup/SignupClient.tsx` - Uses normalizers
- ✅ `lib/journey/builder.ts` - Uses normalizers in fallback

### 2. Apply SQL Migration (Optional but Recommended)

```bash
# Copy SQL to clipboard
cat docs/AVATARS_CHECK_UPDATE.sql | pbcopy

# Open Supabase SQL Editor
open "https://app.supabase.com/project/ivzltlqsjrikffssyvbr/sql/new"

# Paste and run
```

**Or paste directly:**
```sql
ALTER TABLE public.avatars
  DROP CONSTRAINT IF EXISTS avatars_experience_check;

ALTER TABLE public.avatars
  ADD CONSTRAINT avatars_experience_check
  CHECK (experience IN (
    'beginner','intermediate','advanced','knowledge','time','results'
  ));

SELECT pg_notify('pgrst', 'reload schema');
```

### 3. Restart Dev Server

```bash
pkill -f "pnpm.*dev"
pnpm --filter @gymbro/web dev
```

---

## ✅ **Acceptance Criteria**

After deploying:

- [ ] User can sign up with `experience = "results"`
- [ ] Avatar row is created (no constraint violation)
- [ ] Logs show `[Signup] ensureAvatar normalized persona`
- [ ] Logs show `[Signup] ensureAvatar created avatar row`
- [ ] Journey API returns `persona_source: 'avatar'`
- [ ] Journey page shows persona-specific nodes
- [ ] Verification script passes all tests
- [ ] No TypeScript errors
- [ ] StrictMode safe (no double-execution issues)

---

## 🐛 **Troubleshooting**

### Issue: Still getting CHECK constraint error

**Symptom:**
```
violates check constraint "avatars_experience_check"
```

**Solutions:**
1. Check normalization is running:
   ```bash
   grep "ensureAvatar normalized persona" <your-logs>
   ```
2. Verify normalizer is imported in SignupClient
3. Apply SQL migration to relax constraint
4. Check for typos in experience value

### Issue: Warning logs spamming console

**Symptom:**
```
[Normalize] Unknown experience "results", defaulting to "beginner"
```

**Solutions:**
1. This is expected for non-canonical values
2. Update onboarding to send canonical values
3. Or update normalizer to recognize the new value
4. Or suppress warnings in production

### Issue: Journey shows wrong nodes

**Symptom:**
Experience normalized incorrectly (e.g., "results" → "beginner" instead of "knowledge")

**Solutions:**
1. Check normalization mapping in `lib/persona/normalize.ts`
2. Update mapping if business logic changed
3. Verify journey builder expects the canonical value

---

## 📚 **Related Documentation**

- [AVATARS_MIGRATION.md](./AVATARS_MIGRATION.md) - Full migration guide
- [AVATARS_MIGRATION_SUMMARY.md](./AVATARS_MIGRATION_SUMMARY.md) - Quick reference
- [JOURNEY_PERSONA.md](./JOURNEY_PERSONA.md) - Persona → journey mapping

---

## 🎓 **Technical Notes**

### Why Normalization Instead of Just Relaxing Constraint?

1. **Consistency:** Journey logic expects canonical values
2. **Debugging:** Easier to trace when values are predictable
3. **Performance:** Indexes work better with consistent values
4. **Future-proof:** New features can assume canonical format
5. **Safety:** Multiple layers of protection

### Why Not Use ENUM Type?

- PostgreSQL ENUMs are harder to modify
- CHECK constraints are more flexible
- Can add/remove values without migrations
- Better TypeScript integration

### Performance Impact

- **Negligible:** Normalization is O(1) string matching
- **No DB overhead:** Happens in application layer
- **Single pass:** All attributes normalized together

---

## ✉️ **Support**

If normalization fails or you see unexpected behavior:

1. Check logs for normalization warnings
2. Run verification script
3. Verify SQL migration was applied
4. Check that normalizer is imported correctly
5. Ensure no TypeScript errors

