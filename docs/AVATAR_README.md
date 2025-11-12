# Avatar System - Phase A Documentation

## Overview

The Avatar System is a user classification and personalization engine for the GymBro fitness app. It analyzes onboarding questionnaire responses to assign each user a canonical "avatar" persona that represents their fitness goals, experience level, time commitment, and dietary preferences.

**Status:** Phase A Complete (Discovery & Persistence)
**Version:** 1.0
**Last Updated:** 2025-10-30

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Avatar Taxonomy](#avatar-taxonomy)
3. [Resolution Algorithm](#resolution-algorithm)
4. [Database Schema](#database-schema)
5. [API Reference](#api-reference)
6. [Client Usage](#client-usage)
7. [Adding/Editing Avatars](#addingediting-avatars)
8. [Testing](#testing)

---

## System Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Onboarding Flow                          │
│  (gender, goals, experience, frequency, activity, diet...)  │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│           resolveAvatar(answers: OnboardingAnswers)         │
│                                                              │
│  • Scores all avatars against user answers                  │
│  • Priority: goal > frequency > experience > diet           │
│  • Returns best match with confidence (0-1)                 │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                  Database Persistence                        │
│                                                              │
│  • avatar_catalog: Canonical avatar definitions             │
│  • user_avatar: User assignments with confidence/reasoning  │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                  API Layer & Client                          │
│                                                              │
│  • GET /api/avatar: Fetch or auto-assign avatar             │
│  • POST /api/avatar: Bootstrap/recompute avatar             │
│  • getUserAvatar(): Client helper for fetching              │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Onboarding**: User completes questionnaire (goals, frequency, experience, etc.)
2. **Resolution**: `resolveAvatar()` scores all avatars and returns best match
3. **Persistence**: Avatar assignment saved to `user_avatar` table
4. **Retrieval**: Client apps fetch avatar via API or direct DB query

---

## Avatar Taxonomy

The system defines 12 canonical avatars covering the spectrum of fitness personas:

| Avatar ID | Hebrew Title | Goal | Frequency | Key Traits |
|-----------|--------------|------|-----------|------------|
| `rookie-cut` | המתחיל בירידה | loss | 2-3x | Beginner, weight loss |
| `rookie-gain` | המתחיל בעלייה | gain | 2-3x | Beginner, muscle gain |
| `busy-3day-cut` | העסוק בירידה | loss | 3x | Time-constrained, efficient |
| `busy-3day-gain` | העסוק בעלייה | gain | 3x | Time-constrained, efficient |
| `gym-regular-cut` | הקבוע בירידה | loss | 4-5x | Experienced, dedicated |
| `gym-regular-gain` | הקבוע בעלייה | gain | 4-5x | Experienced, dedicated |
| `athlete-cut` | הספורטאי בחיתוך | loss | 5-6x | Advanced, competitive |
| `athlete-gain` | הספורטאי בבנייה | gain | 5-6x | Advanced, competitive |
| `plant-powered-cut` | הצמחוני בירידה | loss | 2-6x | Vegan/vegetarian, weight loss |
| `plant-powered-gain` | הצמחוני בעלייה | gain | 2-6x | Vegan/vegetarian, muscle gain |
| `recomp-balanced` | השיפור המאוזן | recomp | 3-5x | Body recomposition |
| `comeback-cut` | החוזר בירידה | loss | 2-4x | Returning after break |

For detailed avatar specifications, see [AVATAR_TAXONOMY.md](./AVATAR_TAXONOMY.md).

---

## Resolution Algorithm

### Scoring System

Each avatar is scored against user answers using weighted rules:

| Match Type | Points | Description |
|------------|--------|-------------|
| **Exact goal match** | +3 | Goal (gain/loss/recomp) must match |
| **Goal mismatch** | -10 | Disqualifying penalty |
| **Exact frequency match** | +3 | Frequency (2-6x/week) matches |
| **Close frequency** | +1 | Within ±1 day of target |
| **Frequency mismatch** | -2 | Not in acceptable range |
| **Exact experience match** | +2 | Experience level matches |
| **Experience soft mismatch** | -1 | Minor penalty |
| **Diet match (plant-based)** | +3 | Vegan/vegetarian matches plant avatar |
| **Diet mismatch** | -2 | Plant user on non-plant avatar or vice versa |

### Priority Order

1. **Goal** (highest) - Must match or avatar is disqualified
2. **Diet** - Binary filter for plant-based users
3. **Frequency** - Strong weight for training split determination
4. **Experience** - Moderate weight for programming complexity

### Confidence Calculation

```typescript
// Scores are normalized to 0-1 confidence:
// 9+ points → 0.85-1.0 (very confident)
// 5-8 points → 0.6-0.85 (confident)
// 1-4 points → 0.3-0.6 (moderate)
// 0 points → fallback to rookie-cut with 0.1 confidence
```

### Determinism

If multiple avatars have identical scores, tie-breaking is **alphabetical by avatar ID** to ensure consistent results.

### Example

```typescript
const answers: OnboardingAnswers = {
  goal: 'loss',
  frequency: 3,
  experience: 'never',
  diet: 'none',
};

const result = resolveAvatar(answers);
// Returns: rookie-cut with confidence ~0.85
```

---

## Database Schema

### Tables

#### `avatar_catalog`
Stores canonical avatar definitions from `AVATAR_TAXONOMY.json`.

```sql
CREATE TABLE avatar_catalog (
  id text PRIMARY KEY,                    -- Avatar ID (e.g., "rookie-cut")
  title text NOT NULL,                    -- Hebrew title
  spec jsonb NOT NULL,                    -- Full avatar specification
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Spec JSONB Structure:**
```json
{
  "tagline": "התחלה חדשה לשינוי",
  "profile_badge": "🌱",
  "color_token": "#4CAF50",
  "who_is_it_for": ["מתחילים", "..."],
  "fit_rules": {
    "goal": ["loss"],
    "frequency": [2, 3],
    "experience": ["never", "time"]
  },
  "kpi_focus": ["weight", "workouts"],
  "training_split_hint": "3x full-body",
  "nutrition_pattern_hint": "deficit ~300-500 kcal",
  "tone_of_voice": "supportive"
}
```

#### `user_avatar`
Tracks user-to-avatar assignments.

```sql
CREATE TABLE user_avatar (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id),
  avatar_id text NOT NULL REFERENCES avatar_catalog(id),
  confidence real NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  matched_rules jsonb NOT NULL DEFAULT '[]'::jsonb,
  reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Example Row:**
```json
{
  "user_id": "uuid-here",
  "avatar_id": "rookie-cut",
  "confidence": 0.87,
  "matched_rules": ["goal:loss", "frequency:3", "experience:never"],
  "reasons": ["מטרה תואמת: loss", "תדירות אימון תואמת: 3x/שבוע", "ניסיון תואם"],
  "created_at": "2025-10-30T10:00:00Z",
  "updated_at": "2025-10-30T10:00:00Z"
}
```

### Row-Level Security (RLS)

**avatar_catalog:**
- `SELECT`: Anyone (public catalog)
- `INSERT/UPDATE/DELETE`: Service role only

**user_avatar:**
- `SELECT`: Users can read their own avatar
- `INSERT/UPDATE`: Users can modify their own avatar
- `ALL`: Service role has full access

### Helper Functions

```sql
-- Get user avatar with full catalog details
SELECT * FROM get_user_avatar_details('user-uuid-here');
```

---

## API Reference

### GET `/api/avatar`

Fetches user's avatar assignment. If no avatar exists, resolves and assigns one automatically.

**Authentication:** Required (Bearer token)

**Response:**
```json
{
  "avatarId": "rookie-cut",
  "confidence": 0.87,
  "matchedRules": ["goal:loss", "frequency:3"],
  "reasons": ["מטרה תואמת: loss", "תדירות אימון תואמת: 3x/שבוע"],
  "assignedAt": "2025-10-30T10:00:00Z",
  "updatedAt": "2025-10-30T10:00:00Z",
  "details": {
    "id": "rookie-cut",
    "title": "המתחיל בירידה",
    "tagline": "התחלה חדשה לשינוי",
    "profile_badge": "🌱",
    "color_token": "#4CAF50",
    ...
  }
}
```

**Errors:**
- `401`: Missing/invalid authorization
- `500`: Internal error

---

### POST `/api/avatar`

Forces recomputation of avatar based on current profile data. Useful after onboarding completion or profile updates.

**Authentication:** Required (Bearer token)

**Response:**
```json
{
  "success": true,
  "avatarId": "gym-regular-cut",
  "confidence": 0.92,
  "matchedRules": ["goal:loss", "frequency:4", "experience:knowledge"],
  "reasons": ["..."],
  "details": { ... }
}
```

**Errors:**
- `401`: Missing/invalid authorization
- `500`: Internal error or failed to save

---

## Client Usage

### TypeScript Client Library

Located at `apps/web/lib/avatar/client.ts`.

#### Get User Avatar

```typescript
import { getUserAvatar } from '@/lib/avatar/client';

const avatar = await getUserAvatar();

if (avatar) {
  console.log(`User is: ${avatar.details?.title}`);
  console.log(`Confidence: ${avatar.confidence}`);
  console.log(`Badge: ${avatar.details?.profile_badge}`);
}
```

#### Bootstrap Avatar (Recompute)

```typescript
import { bootstrapUserAvatar } from '@/lib/avatar/client';

// Call after onboarding completion
const avatar = await bootstrapUserAvatar();
console.log(`Assigned: ${avatar?.avatarId}`);
```

#### Check if User Has Avatar

```typescript
import { hasUserAvatar } from '@/lib/avatar/client';

const hasAvatar = await hasUserAvatar();
if (!hasAvatar) {
  // Trigger avatar resolution
}
```

#### Direct Database Query (No API)

```typescript
import { getUserAvatarDirect } from '@/lib/avatar/client';

const avatar = await getUserAvatarDirect();
// Returns avatar or null if not assigned
```

#### Get All Avatars

```typescript
import { getAllAvatarsFromCatalog } from '@/lib/avatar/client';

const allAvatars = await getAllAvatarsFromCatalog();
console.log(`Total avatars: ${allAvatars.length}`);
```

---

## Adding/Editing Avatars

### 1. Edit Taxonomy

Edit `configs/avatar/AVATAR_TAXONOMY.json`:

```json
{
  "id": "new-avatar-id",
  "title": "כותרת בעברית",
  "tagline": "משפט קצר",
  "profile_badge": "🎯",
  "color_token": "#FF5733",
  "who_is_it_for": ["תיאור קהל יעד"],
  "fit_rules": {
    "goal": ["loss"],
    "frequency": [3, 4],
    "experience": ["results"]
  },
  "kpi_focus": ["weight", "strength"],
  "training_split_hint": "4x upper/lower",
  "nutrition_pattern_hint": "deficit ~400 kcal",
  "tone_of_voice": "motivating"
}
```

### 2. Update Database Migration

Add avatar to seed section in `supabase/migrations/023_avatar_system.sql`:

```sql
INSERT INTO avatar_catalog (id, title, spec) VALUES
(
  'new-avatar-id',
  'כותרת בעברית',
  '{ "tagline": "...", ... }'::jsonb
);
```

### 3. Run Migration

```bash
cd supabase
supabase migration up
```

### 4. Update Documentation

Add avatar to `docs/AVATAR_TAXONOMY.md`.

### 5. Test

Add test cases to `apps/web/lib/avatar/__tests__/resolveAvatar.test.ts`:

```typescript
test('should match new-avatar-id', () => {
  const answers: OnboardingAnswers = {
    goal: 'loss',
    frequency: 3,
    experience: 'results',
  };
  const result = resolveAvatar(answers);
  expect(result.avatarId).toBe('new-avatar-id');
});
```

---

## Testing

### Run Tests

```bash
cd apps/web
npm test lib/avatar/__tests__/resolveAvatar.test.ts
```

### Test Coverage

Current test suite includes:
- 18+ test cases
- Basic matching (goal, frequency, experience)
- Diet-based filtering (plant-based)
- Frequency-based matching
- Recomp and comeback scenarios
- Edge cases (minimal answers, mismatches)
- Real-world scenarios
- Helper function validation

### Test Strategy

1. **Unit tests** for `resolveAvatar()` logic
2. **Integration tests** for API routes (future)
3. **E2E tests** for client functions (future)

---

## Next Steps (Future Phases)

### Phase B: UI Integration
- Avatar display components
- Avatar selection/override UI
- Profile page avatar widget
- Onboarding completion hook

### Phase C: Personalization
- Avatar-specific workout generation
- Avatar-specific nutrition plans
- Avatar-specific coaching tone
- Avatar-specific KPI dashboards

### Phase D: Analytics
- Avatar distribution metrics
- Confidence score analysis
- Retention by avatar
- Goal achievement by avatar

---

## Troubleshooting

### Avatar Not Assigned

**Symptom:** `getUserAvatar()` returns null

**Solutions:**
1. Check if user is authenticated
2. Verify user has completed onboarding (profile data exists)
3. Call `bootstrapUserAvatar()` to force assignment
4. Check browser console for API errors

### Low Confidence Score

**Symptom:** Avatar assigned but confidence < 0.5

**Causes:**
- Incomplete onboarding data
- Conflicting preferences (e.g., plant-based user with keto preference)
- Unusual frequency/experience combination

**Solutions:**
- Review matched_rules and reasons in response
- Update avatar fit_rules in taxonomy to better cover edge cases

### Wrong Avatar Assigned

**Symptom:** Avatar doesn't match user expectations

**Debug:**
1. Check `matchedRules` and `reasons` in API response
2. Review user's onboarding answers in profile table
3. Verify avatar fit_rules in `AVATAR_TAXONOMY.json`
4. Test with `resolveAvatar()` directly with user's answers

---

## References

- [AVATAR_DIMENSIONS.md](./AVATAR_DIMENSIONS.md) - Full dimension reference
- [AVATAR_TAXONOMY.md](./AVATAR_TAXONOMY.md) - Readable avatar catalog
- `configs/avatar/AVATAR_TAXONOMY.json` - Machine-readable taxonomy
- `apps/web/lib/avatar/resolveAvatar.ts` - Core resolution logic
- `apps/web/lib/avatar/client.ts` - Client helper functions
- `supabase/migrations/023_avatar_system.sql` - Database schema

---

**Maintained by:** GymBro Engineering Team
**Questions?** See codebase or contact maintainers.
