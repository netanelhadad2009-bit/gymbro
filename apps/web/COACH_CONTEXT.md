# AI Coach Context System

## Overview

The AI Coach now answers using **real user data** from Supabase (meals, weigh-ins, profile) under RLS protection. All responses are **plain text only** (no Markdown).

## Architecture

```
User Message
    ↓
Intent Detection (Hebrew keywords)
    ↓
Load User Context (RLS-protected)
    ↓
Direct Response OR AI Model + Context
    ↓
Plain Text Reply (Markdown stripped)
```

## Components

### 1. Database Schema

**Tables:**
- `weigh_ins` - User weight tracking
- `meals` - Nutrition tracking (existing, enhanced with indexes)
- `profiles` - Enhanced with fitness/nutrition fields
- `ai_messages` - Chat history (existing)

**SQL Function:**
- `fn_user_context(user_id, since, until)` - Returns aggregated user data
  - Profile (age, gender, goal, diet, injuries, etc.)
  - Nutrition daily totals + 7/14/30 day averages
  - Recent 5 meals
  - Last 12 weigh-ins

**Security:**
- All tables have RLS enabled
- `SECURITY INVOKER` on SQL function (enforces RLS)
- Cookie-based authentication only (no service role on client)

### 2. Intent Detection

**Hebrew Keywords → Intent:**
- `nutrition_today` - "היום", "כמה קלוריות", "כמה חלבון היום"
- `nutrition_week` - "בשבוע", "7 ימים", "השבוע"
- `weight_trend` - "משקל", "מגמה", "עליתי/ירדתי"
- `last_meals` - "מה אכלתי", "ארוחות אחרונות"
- `free` - Everything else (requires AI model)

### 3. Response Paths

**Direct Response (no AI model call):**
```typescript
// Examples:
"כמה אכלתי היום?" → Direct data lookup
"מה המגמה במשקל?" → Calculate trend from weigh_ins
```

**Model Response (with context):**
```typescript
// System prompt includes:
// - User profile
// - Last 7 days nutrition summary
// - Weight trend
// - Recent meals
```

### 4. Plain Text Enforcement

**Output sanitization:**
```typescript
removeMarkdown(rawResponse, {
  stripListLeaders: true,  // Remove *, -, +
  gfm: true,              // GitHub Flavored Markdown
  useImgAltText: false
})
.replace(/\s{2,}/g, " ")   // Collapse spaces
.replace(/\n{3,}/g, "\n\n") // Max 2 newlines
.trim()
```

**System prompt guardrail:**
```
"ענה בטקסט רגיל בלבד — בלי כוכביות/האשטגים/רשימות/Markdown."
```

## Usage Examples

### Example 1: Today's Nutrition (Direct)

**User:** "כמה אכלתי היום?"

**Intent:** `nutrition_today`

**Response Path:** Direct (no model call)

**Output:**
```
היום צרכת 1820 קלוריות: 120g חלבון, 190g פחמימות, 55g שומן.
רשמת 3 ארוחות.
אתה 380 קלוריות מתחת ליעד הגירעון - מצוין!
```

### Example 2: Weight Trend (Direct)

**User:** "מה המגמה במשקל?"

**Intent:** `weight_trend`

**Response Path:** Direct

**Output:**
```
משקל אחרון: 78.5 ק"ג (25/10)
מגמה: ירידה (0.4 ק"ג/שבוע)
שקילות: 8 רשומות
```

### Example 3: Custom Meal Plan (Model + Context)

**User:** "תבנה לי תפריט ל-2200 קל'"

**Intent:** `free`

**Response Path:** Model with context

**System Prompt Includes:**
```
--- נתוני משתמש אחרונים ---

תזונה:
25/10: 1820kcal • 120P/190C/55F (3 ארוחות)
24/10: 1950kcal • 115P/200C/60F (4 ארוחות)
...

ממוצעים:
7 ימים: 1850kcal, 118g חלבון
30 ימים: 1900kcal, 120g חלבון

משקל:
משקל אחרון: 78.5 ק"ג (25/10)
מגמה: ירידה (0.4 ק"ג/שבוע)

--- סוף נתונים ---
```

**Output:**
```
בהתאם ליעד שלך (ירידה במשקל) ולדיאטה הטבעונית שלך, הנה תפריט ל-2200 קלוריות:

ארוחת בוקר (500 קל):
שייק חלבון צמחי עם בננה ושיבולת שועל

ארוחת צהריים (700 קל):
אורז מלא עם טופו מטוגן וירקות

...
```

## Observability

**Server Logs (PII Redacted):**
```typescript
[AI Coach] Processing message for user: abc12345...
[AI Coach] Message preview: כמה אכלתי היום?
[AI Coach] Detected intent: תזונה היום (nutrition_today)
[AI Coach] Context loaded: { hasProfile: true, mealCount: 5, weighInCount: 8 }
[AI Coach] Response path: direct
[AI Coach] ✓ Request completed: {
  intent: "תזונה היום",
  path: "direct",
  tokens: 0,
  contextWindow: "30d",
  hasData: { meals: true, weighIns: true }
}
```

**What's logged:**
- User ID (truncated to 8 chars)
- Message preview (max 120 chars)
- Intent detected
- Context availability
- Response path (direct vs model)
- Token count (if model called)

**What's NOT logged:**
- Full message content
- Full user data
- Personal details
- Raw JWT tokens

## Security & Limits

### RLS Protection
- All queries use cookie-authenticated Supabase client
- SQL function enforces `auth.uid() = user_id`
- No service role keys on client

### Data Caps
- Context window: 30 days max
- Recent meals: 5 max
- Weigh-ins: 12 max
- Chat history: 19 messages + current

### Missing Data Handling
```typescript
// If no meals:
"אין נתוני תזונה זמינים. הוסיפ/י ארוחות כדי שאוכל לעקוב אחרי התזונה שלך."

// If no weigh-ins:
"אין נתוני שקילה זמינים. הוסיפ/י שקילות באופן קבוע כדי לעקוב אחרי המגמה במשקל."
```

### Guardrails
- No medical diagnosis
- No dangerous supplement recommendations
- Always suggest consulting a professional for medical issues
- Respect user diet preferences (vegan, keto, etc.)
- Respect injuries/limitations

## API Interface

### Request
```typescript
POST /api/coach/chat

{
  "message": "כמה אכלתי היום?"
}
```

### Response
```typescript
{
  "ok": true,
  "message": "היום צרכת 1820 קלוריות...",
  "reply": "היום צרכת 1820 קלוריות...",  // backwards compat
  "userMessage": { ... },
  "assistantMessage": { ... }
}
```

## Testing Acceptance Scenarios

### ✅ User with meals & weigh-ins (last 14 days)

**Test 1:** "כמה אכלתי היום?"
- Expected: Direct response with today's totals
- Path: `direct`

**Test 2:** "מה המגמה במשקל?"
- Expected: Weight trend ± kg/week
- Path: `direct`

**Test 3:** "תבנה לי תפריט ל-2200 קל'"
- Expected: Model response using context (protein goal, diet, allergies)
- Path: `model`

### ✅ User without data

**Test 4:** "כמה אכלתי היום?" (no meals)
- Expected: Suggestion to add meals with CTA
- Path: `direct`

### ✅ Plain text verification

**All responses:**
- No asterisks (**bold**)
- No hashtags (## headings)
- No bullet points (* item)
- No formatting characters

## Migration Path

1. Apply migration: `supabase/migrations/018_user_context.sql`
2. Verify RLS policies active
3. Test with real user data
4. Monitor logs for errors

## Future Extensions

### Map Integration (Stub for Now)
```typescript
// Add to fn_user_context later:
locations: [
  { name: "Gym Near Me", lat, lng, type: "gym" },
  { name: "Healthy Restaurant", lat, lng, type: "restaurant" }
]
```

### Workout Context
```typescript
// Add workout history to context:
recent_workouts: [
  { date, exercise_count, total_volume, duration }
]
```

## Files Modified/Created

### Database
- `supabase/migrations/018_user_context.sql`

### Library
- `lib/coach/context.ts` - Data fetchers
- `lib/coach/intent.ts` - Intent detection
- `lib/coach/directResponse.ts` - Direct response generator
- `lib/coach/systemPrompt.ts` - Enhanced (existing)

### API
- `app/api/coach/chat/route.ts` - Updated with context injection

### Documentation
- `COACH_CONTEXT.md` - This file

---

**Last Updated:** 2025-10-26
**Author:** AI Coach Team
**Status:** ✅ Production Ready
