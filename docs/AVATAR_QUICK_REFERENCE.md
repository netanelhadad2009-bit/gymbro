# Avatar System - Quick Reference Card

One-page cheat sheet for developers working with the Avatar System.

---

## Quick Start

### 1. Get User's Avatar
```typescript
import { getUserAvatar } from '@/lib/avatar/client';

const avatar = await getUserAvatar();
// Returns: { avatarId, confidence, matchedRules, reasons, details }
```

### 2. Assign Avatar After Onboarding
```typescript
import { bootstrapUserAvatar } from '@/lib/avatar/client';

// Call when user completes onboarding
const avatar = await bootstrapUserAvatar();
```

### 3. Resolve Avatar Manually (No DB)
```typescript
import { resolveAvatar } from '@/lib/avatar/resolveAvatar';

const result = resolveAvatar({
  goal: 'loss',
  frequency: 3,
  experience: 'never',
  diet: 'none'
});
// Returns: { avatarId: 'comeback-cut', confidence: 0.78, ... }
```

---

## All 12 Avatars

| ID | Badge | Title | Goal | Frequency | Key Trait |
|----|-------|-------|------|-----------|-----------|
| `rookie-cut` | 🌱 | המתחיל בירידה | loss | 2-3x | Beginner |
| `rookie-gain` | 💪 | המתחיל בעלייה | gain | 2-3x | Beginner |
| `busy-3day-cut` | ⚡ | העסוק בירידה | loss | 3x | Time-constrained |
| `busy-3day-gain` | 🚀 | העסוק בעלייה | gain | 3x | Time-constrained |
| `gym-regular-cut` | 🔥 | הקבוע בירידה | loss | 4-5x | Dedicated |
| `gym-regular-gain` | 💎 | הקבוע בעלייה | gain | 4-5x | Dedicated |
| `athlete-cut` | 🏆 | הספורטאי בחיתוך | loss | 5-6x | Advanced |
| `athlete-gain` | 🦁 | הספורטאי בבנייה | gain | 5-6x | Advanced |
| `plant-powered-cut` | 🌿 | הצמחוני בירידה | loss | 2-6x | Vegan/Vegetarian |
| `plant-powered-gain` | 🥬 | הצמחוני בעלייה | gain | 2-6x | Vegan/Vegetarian |
| `recomp-balanced` | ⚖️ | השיפור המאוזן | recomp | 3-5x | Body recomp |
| `comeback-cut` | 🔄 | החוזר בירידה | loss | 2-4x | Returning athlete |

---

## Scoring Rules

| Match | Points | Example |
|-------|--------|---------|
| Exact goal | +3 | user.goal === 'loss' && avatar.fit_rules.goal includes 'loss' |
| Exact frequency | +3 | user.frequency === 3 && avatar.fit_rules.frequency includes 3 |
| Close frequency | +1 | user.frequency === 4 && avatar allows [3, 5] |
| Exact experience | +2 | user.experience === 'never' && avatar allows 'never' |
| Diet match | +3 | user.diet === 'vegan' && avatar is plant-powered |
| Goal mismatch | -10 | Disqualifying |
| Frequency mismatch | -2 | Outside range |
| Diet mismatch | -2 | Plant user on non-plant avatar |

**Priority:** goal > diet > frequency > experience

---

## Database Tables

### `avatar_catalog`
```sql
SELECT id, title, spec FROM avatar_catalog;
-- Returns: All 12 avatar definitions
```

### `user_avatar`
```sql
SELECT * FROM user_avatar WHERE user_id = 'uuid';
-- Returns: User's assigned avatar with confidence
```

---

## API Endpoints

### GET `/api/avatar`
Fetch user's avatar (auto-assigns if missing)

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
{
  "avatarId": "rookie-cut",
  "confidence": 0.87,
  "matchedRules": ["goal:loss", "frequency:3"],
  "reasons": ["מטרה תואמת: loss", "..."],
  "details": { "id": "rookie-cut", "title": "המתחיל בירידה", ... }
}
```

### POST `/api/avatar`
Force recomputation of avatar

**Headers:** `Authorization: Bearer {token}`

---

## Common Patterns

### Display Avatar Badge
```typescript
<span className="text-4xl">{avatar.details?.profile_badge}</span>
```

### Show Avatar Title & Tagline
```typescript
<h2>{avatar.details?.title}</h2>
<p className="text-sm text-muted">{avatar.details?.tagline}</p>
```

### Use Avatar Color Token
```typescript
<div style={{ backgroundColor: avatar.details?.color_token }}>
  {/* Avatar-themed UI */}
</div>
```

### Check Confidence
```typescript
if (avatar.confidence > 0.8) {
  // High confidence - show personalized content
} else {
  // Low confidence - show generic content
}
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| No avatar returned | User hasn't completed onboarding → call `bootstrapUserAvatar()` |
| Low confidence (<0.5) | Incomplete profile data → prompt user to complete onboarding |
| Wrong avatar | Check `matchedRules` and `reasons` → may need to adjust fit_rules |
| API 401 error | Missing auth token → ensure user is authenticated |

---

## File Locations

- **Core Logic:** `apps/web/lib/avatar/resolveAvatar.ts`
- **Client Helpers:** `apps/web/lib/avatar/client.ts`
- **API Route:** `apps/web/app/api/avatar/route.ts`
- **Taxonomy:** `configs/avatar/AVATAR_TAXONOMY.json`
- **Migration:** `supabase/migrations/023_avatar_system.sql`
- **Docs:** `docs/AVATAR_README.md`

---

## Adding New Avatar

1. Edit `configs/avatar/AVATAR_TAXONOMY.json`
2. Add to migration seed data in `023_avatar_system.sql`
3. Run migration: `supabase migration up`
4. Update docs: `docs/AVATAR_TAXONOMY.md`

---

## Testing

```bash
# Manual verification
cd apps/web
npx tsx lib/avatar/verify.ts

# Unit tests (when configured)
npm test lib/avatar/__tests__/resolveAvatar.test.ts
```

---

**Full Documentation:** [AVATAR_README.md](./AVATAR_README.md)
**Phase Summary:** [AVATAR_PHASE_A_SUMMARY.md](./AVATAR_PHASE_A_SUMMARY.md)
