# Journey Persona System

## Overview

The Journey Persona system generates personalized fitness journeys based on user characteristics (persona). Each user has a persona stored in their avatar, which determines which journey nodes they see and in what order.

## Architecture

```
User Signup
    ↓
ensureAvatar() → Creates avatar with persona
    ↓
Journey Page Load
    ↓
GET /api/journey/plan → Fetches avatar persona
    ↓
buildJourneyFromPersona() → Generates nodes based on rules
    ↓
Return personalized journey with chapters
```

## Persona Type

A `Persona` defines the user's characteristics and goals:

```typescript
export type Persona = {
  gender: 'male' | 'female';
  goal: 'recomp' | 'cut' | 'bulk' | string;
  diet: 'none' | 'vegan' | 'vegetarian' | 'keto' | 'paleo' | string;
  frequency: 'low' | 'medium' | 'high' | string;
  experience: 'beginner' | 'intermediate' | 'advanced' | string;
};
```

### Field Definitions

- **gender**: Biological sex for nutrition calculations (e.g., protein targets)
- **goal**: Primary fitness objective
  - `recomp`: Body recomposition (maintain weight, build muscle, lose fat)
  - `cut`: Weight loss / fat loss
  - `bulk`: Muscle gain / weight gain
- **diet**: Dietary restrictions or preferences
  - `none`: No restrictions (omnivore)
  - `vegan`: Plant-based only
  - `vegetarian`: No meat, but dairy/eggs allowed
  - `keto`: Low-carb, high-fat
  - `paleo`: Whole foods, no grains/dairy
- **frequency**: Workout frequency preference
  - `low`: 1-2 times per week
  - `medium`: 3-4 times per week
  - `high`: 5+ times per week
- **experience**: Fitness experience level
  - `beginner`: New to structured training
  - `intermediate`: 6+ months of consistent training
  - `advanced`: 2+ years of consistent training

## Journey Builder Rules

The `buildJourneyFromPersona()` function applies the following rules to generate a personalized journey:

### Always Included (Basics)

These nodes are included for **all users**, regardless of persona:

1. **weigh_in_today** (FIRST_WEIGH_IN)
   - First body weight measurement
   - Required for tracking progress

2. **log_2_meals** (LOG_MEALS_TODAY)
   - Log at least 2 meals today
   - Teaches food tracking basics

3. **protein_min** (HIT_PROTEIN_GOAL)
   - Hit minimum protein target
   - Threshold based on gender:
     - **Male**: 120g protein
     - **Female**: 90g protein

### Goal-Based Rules

#### Cut Goal (goal === 'cut')
- **cal_deficit_day** (CALORIE_DEFICIT)
  - Eat in a calorie deficit
  - Required for fat loss

#### Bulk Goal (goal === 'bulk')
- **cal_surplus_day** (CALORIE_SURPLUS)
  - Eat in a calorie surplus
  - Required for muscle gain

#### Recomp Goal (goal === 'recomp')
- No calorie-specific nodes
- Focus on protein and training consistency

### Diet-Based Rules

#### Vegan Diet (diet === 'vegan')
- **vegan_protein_sources** (VEGAN_PROTEIN)
  - Learn about plant-based protein sources
  - Hit protein target with vegan foods

#### Keto Diet (diet === 'keto')
- **keto_day** (KETO_COMPLIANT)
  - Eat ≤30g carbs for the day
  - Nutrient: carbs
  - Operator: lte (less than or equal)
  - Threshold: 30

### Frequency/Experience-Based Rules

#### High Frequency OR Intermediate+ Experience
**Condition**: `frequency === 'high' OR experience !== 'beginner'`

- **workout_3x_week** (WORKOUT_FREQUENCY)
  - Complete 3+ workouts this week
  - Builds training consistency

#### Advanced Experience Only
**Condition**: `experience === 'advanced'`

- **week_streak_7** (WEEK_STREAK_7)
  - Maintain a 7-day active streak
  - Advanced consistency challenge

## Chapter System

Nodes are organized into chapters based on their complexity:

### Basics Chapter
- **ID**: `basics`
- **Order**: 0
- **Nodes**:
  - weigh_in_today
  - log_2_meals
  - protein_min
  - diet-specific basics (vegan_protein_sources, keto_day)
  - goal-specific basics (cal_deficit_day, cal_surplus_day)

### Advanced Chapter
- **ID**: `advanced`
- **Order**: 1
- **Nodes**:
  - workout_3x_week

### Expert Chapter
- **ID**: `expert`
- **Order**: 2
- **Nodes**:
  - week_streak_7

## Example Personas and Journeys

### Example 1: Beginner Recomp (Low Frequency)

```typescript
{
  gender: 'male',
  goal: 'recomp',
  diet: 'none',
  frequency: 'low',
  experience: 'beginner'
}
```

**Generated Nodes**:
1. weigh_in_today (FIRST_WEIGH_IN)
2. log_2_meals (LOG_MEALS_TODAY)
3. protein_min (HIT_PROTEIN_GOAL, 120g)

**Chapters**: Basics only

---

### Example 2: Vegan Bulk (High Frequency)

```typescript
{
  gender: 'female',
  goal: 'bulk',
  diet: 'vegan',
  frequency: 'high',
  experience: 'beginner'
}
```

**Generated Nodes**:
1. weigh_in_today (FIRST_WEIGH_IN)
2. log_2_meals (LOG_MEALS_TODAY)
3. protein_min (HIT_PROTEIN_GOAL, 90g)
4. vegan_protein_sources (VEGAN_PROTEIN)
5. cal_surplus_day (CALORIE_SURPLUS)
6. workout_3x_week (WORKOUT_FREQUENCY)

**Chapters**: Basics, Advanced

---

### Example 3: Keto Cut (Intermediate)

```typescript
{
  gender: 'male',
  goal: 'cut',
  diet: 'keto',
  frequency: 'medium',
  experience: 'intermediate'
}
```

**Generated Nodes**:
1. weigh_in_today (FIRST_WEIGH_IN)
2. log_2_meals (LOG_MEALS_TODAY)
3. protein_min (HIT_PROTEIN_GOAL, 120g)
4. keto_day (KETO_COMPLIANT, ≤30g carbs)
5. cal_deficit_day (CALORIE_DEFICIT)
6. workout_3x_week (WORKOUT_FREQUENCY)

**Chapters**: Basics, Advanced

---

### Example 4: Advanced Recomp

```typescript
{
  gender: 'female',
  goal: 'recomp',
  diet: 'none',
  frequency: 'high',
  experience: 'advanced'
}
```

**Generated Nodes**:
1. weigh_in_today (FIRST_WEIGH_IN)
2. log_2_meals (LOG_MEALS_TODAY)
3. protein_min (HIT_PROTEIN_GOAL, 90g)
4. workout_3x_week (WORKOUT_FREQUENCY)
5. week_streak_7 (WEEK_STREAK_7)

**Chapters**: Basics, Advanced, Expert

## How to Add New Rules

### Step 1: Define the Node

Add your node creation logic in `buildJourneyFromPersona()`:

```typescript
export function buildJourneyFromPersona(persona: Persona): {
  chapters: JourneyChapter[];
  nodes: JourneyNode[];
} {
  const nodes: JourneyNode[] = [];
  let order = 0;

  // ... existing nodes ...

  // NEW RULE: Add cardio node for endurance goals
  if (persona.goal === 'endurance') {
    nodes.push(node({
      id: 'cardio_3x_week',
      type: 'CARDIO_FREQUENCY',
      name: 'קרדיו 3 פעמים בשבוע',
      description: 'השלם 3 אימוני קרדיו השבוע',
      chapter: 'basics',
      order: order++,
    }));
  }

  // ... rest of function ...
}
```

### Step 2: Add Tests

Create tests in `__tests__/builder.test.ts`:

```typescript
it('should include cardio node for endurance goal', () => {
  const persona: Persona = {
    gender: 'male',
    goal: 'endurance',
    diet: 'none',
    frequency: 'medium',
    experience: 'beginner',
  };

  const { nodes } = buildJourneyFromPersona(persona);

  const cardio = nodes.find(n => n.id === 'cardio_3x_week');
  expect(cardio).toBeDefined();
  expect(cardio?.type).toBe('CARDIO_FREQUENCY');
});
```

### Step 3: Update This Documentation

Add your new rule to the appropriate section above.

## Helper Functions

### `node()`

Creates a basic journey node:

```typescript
function node(params: {
  id: string;
  type: string;
  name: string;
  description: string;
  chapter: string;
  order: number;
}): JourneyNode
```

### `nodeWithThreshold()`

Creates a node with a numeric threshold (for tracking goals):

```typescript
function nodeWithThreshold(params: {
  id: string;
  type: string;
  name: string;
  description: string;
  chapter: string;
  order: number;
  threshold: number;
  nutrient?: string;
  operator?: string;
}): JourneyNode
```

**Example**:
```typescript
nodeWithThreshold({
  id: 'protein_min',
  type: 'HIT_PROTEIN_GOAL',
  name: 'חלבון מינימלי',
  description: 'השג 120 גרם חלבון ביום',
  chapter: 'basics',
  order: 2,
  threshold: 120,
})
```

### `derivePersonaFromMetadata()`

Fallback function that creates a persona from user metadata or profile:

```typescript
export function derivePersonaFromMetadata(
  metadata: any
): Persona
```

**Usage**: Called by API route when avatar doesn't exist yet.

**Defaults**:
- gender: 'male'
- goal: 'recomp'
- diet: 'none'
- frequency: 'medium'
- experience: 'beginner'

## API Usage

### GET /api/journey/plan

**Authentication**: Required (Supabase session)

**Response**:
```json
{
  "ok": true,
  "plan": {
    "chapters": [
      {
        "id": "basics",
        "name": "יסודות",
        "order": 0,
        "nodes": ["weigh_in_today", "log_2_meals", "protein_min"]
      }
    ],
    "nodes": [
      {
        "id": "weigh_in_today",
        "type": "FIRST_WEIGH_IN",
        "name": "שקילה ראשונה",
        "description": "שקול את עצמך היום",
        "chapter": "basics",
        "order": 0
      }
    ]
  },
  "persona": {
    "gender": "male",
    "goal": "recomp",
    "diet": "none",
    "frequency": "medium",
    "experience": "beginner"
  }
}
```

**Error Responses**:
- **401**: Not authenticated
- **500**: Server error

## Database Schema

### avatars Table

```sql
CREATE TABLE avatars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  persona jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_avatars_user_id ON avatars(user_id);
```

**Persona JSONB Structure**:
```json
{
  "gender": "male",
  "goal": "recomp",
  "diet": "none",
  "frequency": "medium",
  "experience": "beginner"
}
```

## Logging Conventions

All journey persona code uses structured logging with prefixes:

- **[Signup]**: Avatar creation during signup (SignupClient.tsx)
- **[JourneyAPI]**: API route operations (app/api/journey/plan/route.ts)
- **[Journey]**: Client-side journey page operations

**Example Logs**:
```
[Signup] ensureAvatar start
[Signup] ensureAvatar found existing avatar: abc-123
[Signup] Avatar ensured: { id: 'abc-123', persona: {...} }

[JourneyAPI] GET request received
[JourneyAPI] User authenticated: user-456
[JourneyAPI] Found avatar with persona: { gender: 'male', goal: 'recomp', ... }
[JourneyAPI] Journey plan built: { user: 'user-456', chapters: 1, nodes: 4, ... }

[Journey] Bootstrap failed: no_avatar
[Journey] Session complete, navigating to preview
```

## Troubleshooting

### "Bootstrap failed: no_avatar"

**Cause**: User doesn't have an avatar row in the database.

**Solution**: `ensureAvatar()` is called during signup. If this error appears:
1. Check that signup flow completed successfully
2. Verify avatars table exists with correct schema
3. Check for errors in signup logs
4. Run bootstrap endpoint manually: `POST /api/avatar/bootstrap`

### Different personas seeing same nodes

**Cause**: Builder rules not being applied correctly.

**Debug**:
1. Check `[JourneyAPI]` logs to see what persona was used
2. Verify avatar.persona in database matches expected values
3. Add console logs in `buildJourneyFromPersona()` to trace rule execution
4. Run unit tests to verify builder logic

### Persona not updating after profile changes

**Cause**: Persona is stored in avatar and not automatically synced with profile.

**Solution**:
- Personas are set at avatar creation time
- To update persona, update the avatar.persona JSONB field
- Consider adding a persona sync mechanism if needed

## Performance Considerations

- **Journey generation is stateless**: No caching needed, fast calculation
- **Avatar lookup is indexed**: user_id has index for fast queries
- **Fallback is safe**: If avatar missing, derives from metadata/profile
- **API uses no-store cache**: Always fresh data, no stale journeys

## Testing

Run tests with:
```bash
# Run all journey tests
pnpm test journey

# Run builder tests specifically
pnpm test builder.test
```

**Test Coverage**:
- ✅ All basic nodes included
- ✅ Gender-specific protein targets
- ✅ Goal-based nodes (cut, bulk, recomp)
- ✅ Diet-based nodes (vegan, keto)
- ✅ Frequency/experience nodes
- ✅ Chapter grouping
- ✅ Sequential ordering
- ✅ Minimum node count
- ✅ Persona derivation from metadata

## Future Enhancements

Potential improvements to the persona system:

1. **Dynamic Persona Updates**: Sync persona with profile changes
2. **More Goals**: Add 'strength', 'endurance', 'flexibility'
3. **More Diets**: Add 'mediterranean', 'carnivore', 'intermittent_fasting'
4. **Progressive Chapters**: Unlock advanced chapters based on completion
5. **Persona Quiz**: Interactive onboarding to determine ideal persona
6. **A/B Testing**: Test different node combinations per persona
7. **Seasonal Variations**: Adjust nodes based on time of year
8. **Injury Adaptations**: Add injury-specific node variations

---

**Last Updated**: 2025-11-02
**Version**: 1.0.0
**Status**: ✅ Production Ready
