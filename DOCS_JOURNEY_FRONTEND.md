## Journey Frontend Documentation

## Overview

The Journey frontend provides a gamified, map-based interface for users to track their progress through structured tasks and milestones. The UI is fully RTL-optimized for Hebrew, with real-time updates and smooth micro-interactions.

## Component Tree

```
JourneyPage (page.tsx)
├── StickyHeader
├── KpiStrip
│   └── 4x Compact KPI Cards (calories, protein, weight, streak)
├── MapRail
│   ├── Chapter Labels (sticky)
│   └── Node Buttons (vertical scroll + snap)
├── NodeCard
│   ├── State Badge (locked/available/active/completed)
│   ├── Primary Task Section
│   ├── Checklist Items
│   ├── Missing Requirements Warning
│   └── CTA Buttons (Start/Continue/Complete)
└── InsightsPanel
    └── 2-3 Insight Cards

JourneySkeleton (loading state)
```

## Page: /journey

**Location:** `apps/web/app/(app)/journey/page.tsx`

### Props
None (page component)

### State Management
```typescript
const { data, loading, error, refetch } = useJourney();
const { trackTask, completeNode, processing } = useNodeActions();
const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
```

### Key Features
- Server-side data fetch via `/api/journey`
- Realtime subscription to `user_progress` changes
- Optimistic UI updates
- Auto-scroll to active/focused node
- Confetti animation on completion
- Haptic feedback (if available)

### States
1. **Loading** → Shows `JourneySkeleton`
2. **Error** → Shows retry button
3. **Empty** → Shows "המסע בבנייה" message
4. **Loaded** → Shows full journey UI

## Components

### MapRail

**File:** `components/journey/MapRail.tsx`

**Purpose:** Vertical scrollable list of journey nodes with chapter sections

**Props:**
```typescript
{
  chapters: JourneyChapter[];
  focusedNodeId: string | null;
  onNodeFocus: (nodeId: string) => void;
}
```

**Features:**
- Snap scrolling for smooth navigation
- Sticky chapter labels
- Visual states: LOCKED, AVAILABLE, ACTIVE, COMPLETED
- Connecting lines between nodes
- Auto-scroll to focused node
- Hover effects and scale transitions

**State Colors:**
| State | Background | Border | Icon |
|-------|-----------|--------|------|
| LOCKED | `bg-neutral-900` | `border-neutral-700` | 🔒 |
| AVAILABLE | `bg-neutral-800` | `border-[#E2F163]` | ○ |
| ACTIVE | `bg-[#E2F163]` | `border-[#E2F163]` | → |
| COMPLETED | `bg-lime-400` | `border-lime-400` | ✓ |

### NodeCard

**File:** `components/journey/NodeCard.tsx`

**Purpose:** Displays detailed information about a specific journey node

**Props:**
```typescript
{
  node: JourneyNode;
  onComplete: () => void;
  onPrimaryTask: () => void;
  processing: boolean;
}
```

**Sections:**
1. **Header** - Icon, title, description, state badge
2. **Primary Task** - Highlighted main action with CTA button
3. **Checklist** - List of subtasks with completion status
4. **Missing Requirements** - Warning for incomplete prerequisites
5. **CTA Button** - Context-aware action (Start/Continue/Complete)

**Button Logic:**
```typescript
if (isLocked) → No button, show locked message
if (isAvailable) → "התחל שלב" → calls onPrimaryTask()
if (isActive && !canComplete) → Disabled "השלם משימות כדי להמשיך"
if (isActive && canComplete) → "השלם שלב ✓" → calls onComplete()
if (isCompleted) → No button, show completion date
```

**Success Animation:**
- Shows 🎉 emoji with bounce animation
- Border changes to lime-400 with glow
- Triggers haptic feedback (if supported)
- Auto-scrolls to next node after 1s

### KpiStrip

**File:** `components/journey/KpiStrip.tsx`

**Purpose:** Compact metric cards at the top of the page

**Metrics:**
1. **Calories** (lime-400) - Today's total
2. **Protein** (#C9456C) - Today's grams
3. **Weight** (#5B9BFF) - Last recorded
4. **Streak** (#FFA856) - Consecutive days

**Interaction:**
- Each card is clickable
- Navigates to `/progress#<metric>`
- Hover effect: `hover:bg-neutral-800`
- Active effect: `active:scale-95`

### InsightsPanel

**File:** `components/journey/InsightsPanel.tsx`

**Purpose:** Shows 2-3 actionable insights based on user data

**Insight Types:**
- **Success** (lime-400) - Achievements and milestones
- **Info** (#5B9BFF) - Progress towards goals
- **Tip** (#FFA856) - Recommendations and suggestions

**Data Source:**
- TODO: Integrate with `fn_user_context`
- Currently shows mock data

### JourneySkeleton

**File:** `components/journey/JourneySkeleton.tsx`

**Purpose:** Loading placeholder with shimmer effect

**Layout:**
- 4x KPI card skeletons
- Map rail (6x node skeletons)
- Node card skeleton
- Insights panel skeleton

## Hooks

### useJourney()

**File:** `lib/journey/client.ts`

**Purpose:** Manages journey data, loading state, and realtime updates

**Returns:**
```typescript
{
  data: JourneyData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}
```

**Features:**
- Fetches data from `/api/journey` on mount
- Sets up realtime subscription via `subscribeUserProgress()`
- Merges progress updates optimistically
- Auto-cleanup on unmount

**State Reducer:**
```typescript
FETCH_START → loading=true
FETCH_SUCCESS → data updated, loading=false
FETCH_ERROR → error set, loading=false
MERGE_PROGRESS → update specific node progress
```

### useNodeActions()

**File:** `lib/journey/client.ts`

**Purpose:** Provides functions for tracking tasks and completing nodes

**Returns:**
```typescript
{
  trackTask: (task_key: string, value?: any, node_id?: string) => Promise<TrackResponse>;
  completeNode: (node_id: string) => Promise<CompleteResponse>;
  processing: boolean;
}
```

**Features:**
- Calls `/api/journey/track` and `/api/journey/complete`
- Sets `processing` flag during requests
- Triggers haptic feedback on completion
- Logs all actions with `[JourneyClient]` prefix

## Navigation Flows

### Primary Task Routing

The `handlePrimaryTask()` function routes users based on `node.primary_task`:

| Task Key | Destination | Screen |
|----------|-------------|--------|
| `weigh_in_today` | `/progress#weight` | Weight logging |
| `log_*_meals` | `/nutrition` | Meal logging |
| `protein_*` | `/nutrition` | Nutrition tracking |
| Other | `/progress` | General progress |

### Example:
```typescript
if (task === "weigh_in_today") {
  router.push("/progress#weight");
} else if (task.includes("log_") && task.includes("meals")) {
  router.push("/nutrition");
}
```

## Adding a New Node Type

### 1. Update conditions_json

In the database migration or admin panel:

```sql
INSERT INTO journey_nodes (chapter_id, title, conditions_json, primary_task)
VALUES (
  '<chapter_id>',
  'New Task Title',
  '{"primary":"new_task_key","checklist":["subtask_1","subtask_2"],"thresholds":{"value":100}}'::jsonb,
  'new_task_key'
);
```

### 2. Add Task Label

In `NodeCard.tsx`:

```typescript
const getTaskLabel = (key: string): string => {
  const labels: Record<string, string> = {
    // ... existing labels
    new_task_key: "תיאור המשימה החדשה"
  };
  return labels[key] || key;
};
```

### 3. Add Evaluation Logic

In `lib/journey/compute.ts`:

```typescript
function evaluateCondition(key: string, userContext: UserContext, ...) {
  switch (key) {
    // ... existing cases
    case "new_task_key":
      return (userContext.some_metric || 0) >= (thresholds.value || 100);
  }
}
```

### 4. Add Routing (if needed)

In `page.tsx` `handlePrimaryTask()`:

```typescript
if (task === "new_task_key") {
  router.push("/new-screen");
}
```

## Manual Test Plan

### Test 1: Page Load
**Steps:**
1. Navigate to `/journey`
2. Verify loading skeleton appears briefly
3. Verify journey map loads with demo data
4. Check that active/first available node is focused

**Expected:**
- No console errors
- MapRail shows all nodes
- NodeCard displays correct node details
- KPI Strip shows metrics

### Test 2: Node Navigation
**Steps:**
1. Click on different nodes in MapRail
2. Verify NodeCard updates to show clicked node
3. Scroll MapRail and verify snap behavior
4. Check auto-scroll to focused node

**Expected:**
- Smooth transitions
- Correct node details displayed
- Snap scrolling works
- Auto-scroll centers focused node

### Test 3: Primary Task Action
**Steps:**
1. Focus an ACTIVE or AVAILABLE node
2. Click "התחל משימה" or "המשך עכשיו"
3. Verify navigation to correct screen

**Expected:**
- Navigates to `/progress`, `/nutrition`, etc.
- Console log shows `[JourneyUI] Primary task clicked`

### Test 4: Node Completion (Happy Path)
**Steps:**
1. Focus an ACTIVE node with all conditions met
2. Click "השלם שלב ✓"
3. Verify completion animation (confetti, haptic)
4. Check that node state changes to COMPLETED
5. Verify next node unlocks

**Expected:**
- Success animation plays
- State badge shows "הושלם" with date
- Next node becomes AVAILABLE
- Realtime update triggers
- Console logs show completion

### Test 5: Node Completion (Missing Prerequisites)
**Steps:**
1. Focus an ACTIVE node with unmet conditions
2. Verify button shows "השלם משימות כדי להמשיך" (disabled)
3. Try to click (should not work)
4. Check "עוד לא מוכן" warning shows missing items

**Expected:**
- Button is disabled
- Missing requirements list displayed
- No API call made

### Test 6: Locked Node
**Steps:**
1. Click on a LOCKED node
2. Verify card shows lock icon and message
3. Check that no action buttons appear

**Expected:**
- Shows "🔒 השלם את השלבים הקודמים"
- No CTA buttons visible
- Node appears ghosted/grayed out

### Test 7: Realtime Updates
**Steps:**
1. Open journey page in browser A
2. Complete a node via API or browser B
3. Observe browser A updates automatically

**Expected:**
- Node state updates without page refresh
- Console shows `[JourneyClient] Realtime update`
- Smooth transition animation

### Test 8: Error States
**Steps:**
1. Disconnect network
2. Try to complete a node
3. Verify error handling
4. Reconnect and retry

**Expected:**
- Error state shows retry button
- Processing flag prevents duplicate requests
- Retry works after reconnection

### Test 9: Empty/No Data
**Steps:**
1. Test with user who has no journey data
2. Verify empty state message
3. Click "חזור לדף הבית"

**Expected:**
- Shows "המסע בבנייה" message
- Button navigates to `/`
- No crashes or console errors

### Test 10: RTL Layout
**Steps:**
1. Inspect all text alignment
2. Check scrollbar position
3. Verify icon/button placement
4. Test on different screen sizes

**Expected:**
- All text aligns right
- Scrollbar on left side
- Icons on correct side
- Responsive layout works

## Performance Optimization

### Lazy Loading
- Journey data fetched once on mount
- Realtime updates merge incrementally
- Node focus uses `useCallback` to prevent re-renders

### Memo Optimization
- Consider memoizing MapRail nodes
- Memoize NodeCard evaluations
- Use React.memo for static components

### Network Efficiency
- Single API call fetches complete journey
- Realtime uses filtered channels (per user)
- Debounced realtime updates (500ms)

## Accessibility

### Keyboard Navigation
- Tab through nodes in MapRail
- Enter to focus node
- Space/Enter to activate buttons

### Screen Readers
- Semantic HTML structure
- ARIA labels for state badges
- Alt text for icons

### Color Contrast
- All text meets WCAG AA standards
- State colors have sufficient contrast
- Focus indicators visible

## Troubleshooting

### Issue: Nodes not loading
**Cause:** API not returning data
**Solution:** Check `/api/journey` endpoint, verify migration applied

### Issue: Realtime not working
**Cause:** Publication not configured
**Solution:** Run `SELECT * FROM pg_publication_tables WHERE tablename='user_progress'`

### Issue: Complete button always disabled
**Cause:** Conditions not evaluating correctly
**Solution:** Check `fn_user_context` data, verify thresholds in `conditions_json`

### Issue: Navigation not working
**Cause:** Primary task routing missing
**Solution:** Add route mapping in `handlePrimaryTask()`

## Future Enhancements

- [ ] Add confetti animation library
- [ ] Implement progressive unlock animations
- [ ] Add sound effects toggle
- [ ] Create journey preview mode for new users
- [ ] Add social sharing for completed nodes
- [ ] Implement journey history view
- [ ] Add custom node icons upload
- [ ] Create journey statistics dashboard

---

**Version:** 1.0.0
**Last Updated:** 2025-01-15
**Maintainer:** GymBro Team
