# Journey Map Backend Documentation

## Overview

The Journey Map backend provides a complete gamification system for tracking user progress through a structured journey of tasks and milestones. Users earn points and badges as they complete nodes (tasks) within chapters (sections).

## Architecture

### Entity Relationship Diagram (ERD)

```
┌──────────────────────┐
│ journey_chapters     │
│──────────────────────│
│ id (PK)              │
│ title                │
│ order_index          │
│ created_at           │
└──────────┬───────────┘
           │
           │ 1:N
           │
┌──────────▼───────────┐
│ journey_nodes        │
│──────────────────────│
│ id (PK)              │
│ chapter_id (FK)      │
│ title                │
│ description          │
│ order_index          │
│ icon                 │
│ primary_task         │
│ conditions_json      │◄────┐
│ created_at           │     │
└──────────┬───────────┘     │
           │                 │
           │ 1:N             │
           │                 │
┌──────────▼───────────┐     │
│ user_progress        │     │
│──────────────────────│     │
│ user_id (PK)         │     │
│ node_id (PK,FK)──────┘     │
│ state                │     │
│ progress_json        │     │
│ completed_at         │     │
│ updated_at           │     │
└──────────────────────┘     │
                             │
┌──────────────────────┐     │
│ user_points          │     │
│──────────────────────│     │
│ id (PK)              │     │
│ user_id              │     │
│ date                 │     │
│ points               │     │
│ reason               │     │
│ created_at           │     │
└──────────────────────┘     │
                             │
┌──────────────────────┐     │
│ user_badges          │     │
│──────────────────────│     │
│ id (PK)              │     │
│ user_id              │     │
│ badge_code           │     │
│ earned_at            │     │
│ UNIQUE(user_id,      │     │
│        badge_code)   │     │
└──────────────────────┘
```

## Database Schema

### Tables

#### `journey_chapters`
Main sections of the user journey.

```sql
CREATE TABLE public.journey_chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  order_index int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
```

#### `journey_nodes`
Individual tasks/milestones within chapters.

```sql
CREATE TABLE public.journey_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id uuid NOT NULL REFERENCES journey_chapters(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  order_index int NOT NULL DEFAULT 0,
  icon text,
  primary_task text,
  conditions_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
```

**conditions_json structure:**
```json
{
  "primary": "weigh_in_today",
  "checklist": ["log_2_meals", "protein_min"],
  "thresholds": {
    "protein_g": 80,
    "calories": 2000
  }
}
```

#### `user_progress`
Tracks user state for each node.

```sql
CREATE TABLE public.user_progress (
  user_id uuid NOT NULL,
  node_id uuid NOT NULL REFERENCES journey_nodes(id) ON DELETE CASCADE,
  state text NOT NULL DEFAULT 'LOCKED'
    CHECK (state IN ('LOCKED', 'AVAILABLE', 'ACTIVE', 'COMPLETED')),
  progress_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  completed_at timestamptz,
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, node_id)
);
```

**State transitions:**
- `LOCKED` → not yet available
- `AVAILABLE` → can start
- `ACTIVE` → in progress
- `COMPLETED` → done

#### `user_points`
Log of points earned by users.

```sql
CREATE TABLE public.user_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL DEFAULT current_date,
  points int NOT NULL DEFAULT 0,
  reason text,
  created_at timestamptz DEFAULT now()
);
```

#### `user_badges`
Achievements earned by users.

```sql
CREATE TABLE public.user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  badge_code text NOT NULL,
  earned_at timestamptz DEFAULT now(),
  UNIQUE (user_id, badge_code)
);
```

### Indexes

```sql
CREATE INDEX idx_journey_chapters_order ON journey_chapters(order_index);
CREATE INDEX idx_journey_nodes_chapter_order ON journey_nodes(chapter_id, order_index);
CREATE INDEX idx_user_progress_user_state ON user_progress(user_id, state);
CREATE INDEX idx_user_points_user_date ON user_points(user_id, date);
CREATE INDEX idx_user_badges_user_code ON user_badges(user_id, badge_code);
```

## Row Level Security (RLS)

### Policies

All user tables enforce that `user_id = auth.uid()`:

**user_progress:**
```sql
CREATE POLICY "user_progress_select" ON user_progress
  FOR SELECT USING (user_id = auth.uid());
-- Similar for INSERT, UPDATE, DELETE
```

**user_points:**
```sql
CREATE POLICY "user_points_select" ON user_points
  FOR SELECT USING (user_id = auth.uid());
-- Similar for INSERT, UPDATE, DELETE
```

**user_badges:**
```sql
CREATE POLICY "user_badges_select" ON user_badges
  FOR SELECT USING (user_id = auth.uid());
-- Similar for INSERT, UPDATE, DELETE
```

**journey_chapters and journey_nodes:**
- Read-only (no RLS) - can be read by anyone
- Only modified by admins via SQL

### Triggers

**Auto-set user_id:**
```sql
CREATE TRIGGER trigger_user_progress_set_user_id
  BEFORE INSERT ON user_progress
  FOR EACH ROW EXECUTE FUNCTION fn_set_user_id();
```

**Auto-update timestamp:**
```sql
CREATE TRIGGER trigger_user_progress_update_timestamp
  BEFORE UPDATE ON user_progress
  FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();
```

## Realtime

### Configuration

```sql
ALTER TABLE public.user_progress REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_progress;
```

### Subscription Example

```typescript
import { subscribeUserProgress } from "@/lib/journey/realtime";

const channel = subscribeUserProgress(userId, (payload) => {
  console.log("Progress updated:", payload.state, payload.node_id);
  // Refresh UI
});

// Cleanup
channel.unsubscribe();
```

## API Endpoints

### GET /api/journey

Returns complete journey structure with user progress.

**Request:**
```
GET /api/journey
```

**Response (unauthenticated):**
```json
{
  "ok": true,
  "auth": false,
  "data": {
    "chapters": [],
    "total_points": 0,
    "total_badges": 0
  }
}
```

**Response (authenticated):**
```json
{
  "ok": true,
  "auth": true,
  "data": {
    "chapters": [
      {
        "id": "...",
        "title": "שלב הבסיסים",
        "order_index": 1,
        "nodes": [
          {
            "id": "...",
            "title": "שקילה ראשונה",
            "description": "תעד את המשקל הנוכחי שלך",
            "icon": "⚖️",
            "primary_task": "weigh_in_today",
            "conditions_json": {...},
            "progress": {
              "state": "AVAILABLE",
              "progress_json": {},
              "completed_at": null,
              "updated_at": "2025-01-15T10:00:00Z"
            }
          }
        ]
      }
    ],
    "total_points": 125,
    "total_badges": 3
  }
}
```

**Logs:**
```
[JourneyAPI] GET /api/journey - Start
[JourneyAPI] Authenticated user: a1b2c3d4
[JourneyAPI] Success: { userId: 'a1b2c3d4', chapters: 2, totalPoints: 125, duration: '45ms' }
```

### POST /api/journey/track

Tracks task progress and evaluates completion conditions.

**Request:**
```json
POST /api/journey/track
Content-Type: application/json

{
  "task_key": "weigh_in_today",
  "value": true,
  "node_id": "00000000-0000-0000-0000-000000000101"
}
```

**Response:**
```json
{
  "ok": true,
  "can_complete": true,
  "satisfied": ["weigh_in_today"],
  "missing": []
}
```

**Response (incomplete):**
```json
{
  "ok": true,
  "can_complete": false,
  "satisfied": ["weigh_in_today"],
  "missing": ["log_2_meals", "protein_min"]
}
```

**Logs:**
```
[JourneyTrack] POST /api/journey/track - Start { bodyHash: 'a1b2c3d4' }
[JourneyTrack] Authenticated: { userId: 'a1b2c3d4', task_key: 'weigh_in_today', node_id: '00000000' }
[JourneyTrack] Success: { canComplete: true, satisfied: 1, missing: 0, duration: '67ms' }
```

### POST /api/journey/complete

Completes a node, awards points/badges, and unlocks next node.

**Request:**
```json
POST /api/journey/complete
Content-Type: application/json

{
  "node_id": "00000000-0000-0000-0000-000000000101"
}
```

**Response (success):**
```json
{
  "ok": true,
  "points_awarded": 25,
  "next_node_id": "00000000-0000-0000-0000-000000000102",
  "message": "השלמת בהצלחה! קיבלת 25 נקודות"
}
```

**Response (conditions not met):**
```json
{
  "ok": false,
  "error": "ConditionsNotMet",
  "message": "Node conditions not satisfied",
  "missing": ["log_2_meals"],
  "satisfied": ["weigh_in_today"]
}
```

**Logs:**
```
[JourneyComplete] POST /api/journey/complete - Start { bodyHash: 'a1b2c3d4' }
[JourneyComplete] Authenticated: { userId: 'a1b2c3d4', node_id: '00000000' }
[JourneyComplete] Success: { userId: 'a1b2c3d4', points: 25, next_node_id: '00000000', duration: '89ms' }
```

## Helper Functions

### `fn_journey_user_view(p_user uuid)`

Returns complete journey structure with user progress in a single query.

**Usage:**
```sql
SELECT public.fn_journey_user_view('a1b2c3d4-...');
```

**Returns:** JSONB object matching GET /api/journey response structure.

## Client Libraries

### Queries (`lib/journey/queries.ts`)

```typescript
import { fetchJourney, trackTask, completeNode } from "@/lib/journey/queries";

// Fetch journey
const result = await fetchJourney();
if (result.ok) {
  console.log("Chapters:", result.data.chapters);
}

// Track progress
const track = await trackTask("weigh_in_today", true, nodeId);
if (track.can_complete) {
  console.log("Ready to complete!");
}

// Complete node
const complete = await completeNode(nodeId);
if (complete.ok) {
  console.log("Points awarded:", complete.points_awarded);
}
```

### Compute (`lib/journey/compute.ts`)

```typescript
import { evaluateNode } from "@/lib/journey/compute";

const evaluation = evaluateNode(
  node.conditions_json,
  userContext,
  progress.progress_json
);

console.log("Can complete:", evaluation.canComplete);
console.log("Missing:", evaluation.missing);
```

### Realtime (`lib/journey/realtime.ts`)

```typescript
import { subscribeUserProgress } from "@/lib/journey/realtime";

const channel = subscribeUserProgress(userId, (payload) => {
  console.log("State changed:", payload.state);
});

// Later
channel.unsubscribe();
```

## Testing

### Run Test Suite

```bash
cd apps/web
tsx scripts/test-journey.ts
```

### Expected Output

```
════════════════════════════════════════════════════════════
Journey API Test Suite
════════════════════════════════════════════════════════════

[Test 1] GET /api/journey (unauthenticated)
✓ PASS - Returns empty structure for unauthenticated users

[Test 2] GET /api/journey (authenticated)
✓ PASS - Returns journey structure
  Chapters: 2
  Total Points: 0
  Total Badges: 0

[Test 3] POST /api/journey/track
✓ PASS - Endpoint responds correctly
  Can Complete: false
  Missing: log_2_meals

[Test 4] POST /api/journey/complete
✓ PASS - Endpoint responds correctly
  ⚠ Conditions not met (expected for demo)

[Test 5] Validate response structure
✓ PASS - Response structure is valid

════════════════════════════════════════════════════════════
Test Summary
════════════════════════════════════════════════════════════
✓ GET /api/journey (unauth): Returns empty structure (45ms)
✓ GET /api/journey (auth): Returns journey data (67ms)
✓ POST /api/journey/track: Accepts request (89ms)
✓ POST /api/journey/complete: Endpoint responds (102ms)
✓ Response structure: All required fields present

────────────────────────────────────────────────────────────
Total: 5/5 passed
════════════════════════════════════════════════════════════
```

## Acceptance Criteria

### ✅ Realtime Publication

```sql
SELECT * FROM pg_publication_tables WHERE tablename='user_progress';
```

**Expected:** 1 row returned.

### ✅ SQL Function Works

```sql
SELECT public.fn_journey_user_view(auth.uid());
```

**Expected:** JSONB object with chapters, nodes, and progress.

### ✅ API Returns 200

```bash
curl http://localhost:3000/api/journey
```

**Expected:** `{ "ok": true, "auth": false, ... }`

### ✅ Realtime Triggers

```sql
INSERT INTO public.user_progress (user_id, node_id, state)
VALUES (auth.uid(), '00000000-0000-0000-0000-000000000101', 'ACTIVE');
```

**Expected:** Realtime event emitted to subscribed clients.

### ✅ RLS Enforcement

```sql
-- As user A
SELECT * FROM user_progress WHERE user_id = '<user_b_id>';
```

**Expected:** 0 rows (blocked by RLS).

### ✅ Idempotency

```bash
# Run migration twice
psql -f supabase/migrations/013_journey_backend.sql
psql -f supabase/migrations/013_journey_backend.sql
```

**Expected:** No errors, tables exist with correct structure.

## Migration

### Apply Migration

```bash
# Local development
supabase db reset

# Production
supabase db push
```

### Verify Migration

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'journey_%' OR table_name LIKE 'user_%';

-- Check seed data
SELECT COUNT(*) FROM journey_chapters; -- Should be 2
SELECT COUNT(*) FROM journey_nodes;    -- Should be 4

-- Check indexes
SELECT indexname FROM pg_indexes
WHERE tablename IN ('journey_chapters', 'journey_nodes', 'user_progress');
```

## Error Handling

### Common Errors

**Error:** `ConditionsNotMet`
- **Cause:** User trying to complete node without meeting requirements
- **Solution:** Use `/api/journey/track` first to check conditions

**Error:** `Unauthorized`
- **Cause:** No valid session
- **Solution:** Ensure user is authenticated

**Error:** `DatabaseError`
- **Cause:** SQL constraint violation or permission issue
- **Solution:** Check RLS policies and foreign keys

## Performance

### Query Optimization

- All queries use indexes
- `fn_journey_user_view` uses CTEs and aggregations
- Realtime subscription uses filtered channels

### Caching Strategy

- Journey structure rarely changes → cache on client
- User progress changes often → use realtime subscriptions
- Points/badges → refetch after completion

## Security

### Authentication

- All endpoints require valid Supabase session (except GET unauth)
- Session validated via `createClient().auth.getSession()`

### Authorization

- RLS policies ensure users only access their own data
- Triggers auto-set `user_id` from `auth.uid()`

### Input Validation

- All endpoints use Zod schemas
- UUIDs validated
- SQL injection prevented via parameterized queries

## Observability

### Structured Logging

All logs prefixed with:
- `[JourneyAPI]` - GET /api/journey
- `[JourneyTrack]` - POST /api/journey/track
- `[JourneyComplete]` - POST /api/journey/complete
- `[JourneyRealtime]` - Realtime subscriptions

### Logged Fields

- `userId` (first 8 chars)
- `node_id` (first 8 chars)
- `bodyHash` (MD5 of request body)
- `duration` (in milliseconds)
- `canComplete` boolean
- `points_awarded`

### Example Log Entry

```
[JourneyComplete] Success: {
  userId: 'a1b2c3d4',
  node_id: '00000000',
  points: 25,
  next_node_id: '00000000',
  duration: '89ms'
}
```

## Deployment Checklist

- [ ] Run migration: `supabase db push`
- [ ] Verify tables: Check all 5 tables exist
- [ ] Verify RLS: Test with multiple users
- [ ] Verify realtime: Check publication tables
- [ ] Test endpoints: Run `tsx scripts/test-journey.ts`
- [ ] Monitor logs: Check structured logging works
- [ ] Performance test: Measure query times
- [ ] Security audit: Verify RLS policies

## Future Enhancements

- [ ] Add webhook notifications for completions
- [ ] Implement leaderboards
- [ ] Add seasonal/limited-time nodes
- [ ] Create admin dashboard for journey management
- [ ] Add A/B testing for different node structures
- [ ] Implement node prerequisites (unlock patterns)
- [ ] Add visual progress indicators
- [ ] Export user journey data as JSON

---

**Version:** 1.0.0
**Last Updated:** 2025-01-15
**Maintainer:** GymBro Team
