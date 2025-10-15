# GymBro Journey Map - Stage Progression System

A Candy Crush-style gamified fitness journey for GymBro with 5-8 dynamic stages, XP rewards, and requirement-based unlocking.

## 🎯 What Was Built

### ✅ Database Layer
- **Migration**: `packages/db/prisma/migrations/20251010100011_add_stage_tables/`
  - `stage_library` table - Master catalog of 8 Hebrew fitness stages
  - `user_stage` table - User's personalized progression track
- **Seed Data**: 8 Hebrew stages (בסיס, משמעת יומית, קפיצת מדרגה, etc.)

### ✅ Core Infrastructure
- **Design Tokens** (`lib/tokens.ts`)
  - Brand colors: #0e0f12 background + #E2F163 accent
  - Typography, spacing, shadows, z-index system

- **Hebrew i18n** (`lib/i18n/he.ts`)
  - Complete RTL translations for all UI strings
  - Stage states, actions, requirements, toasts

- **Stage Engine** (`lib/stageEngine.ts`)
  - `evaluateRequirements()` - AND/OR logic for metric rules
  - `deriveStageState()` - Computes locked/available/in_progress/completed
  - `calculateNewXP()` - XP awards with capping
  - `getNextSteps()` - Hebrew actionable suggestions
  - `selectStagesForUser()` - Personalization by goal/level

- **Path Generator** (`lib/path.ts`)
  - Bézier curve SVG path generation
  - Node position calculation along path
  - Viewport bounds for pan/zoom

### ✅ UI Components
- **StageNode** (`app/(app)/journey/StageNode.tsx`)
  - Interactive SVG badge with 4 visual states
  - Progress ring (conic-gradient) for in_progress
  - Pulsing glow for completed stages
  - Lock indicator for locked stages
  - XP display and stage numbers
  - Framer Motion animations (bounce, scale, pulse)

- **Journey Page** (`app/(app)/journey/page.tsx`)
  - Full-page SVG canvas with animated dotted path
  - 5 mock stages demonstrating all states
  - Click-to-open stage details modal
  - Responsive layout with RTL support

## 🚀 How to Use

### 1. Run Database Migration
```bash
cd packages/db
npx prisma migrate dev
```

### 2. Seed Stage Data
```bash
psql $DATABASE_URL < prisma/migrations/20251010100011_add_stage_tables/seed.sql
```

### 3. View the Journey Map
Navigate to: **http://localhost:3000/journey**

You'll see:
- Stage 1 (בסיס) - **In Progress** with 52/80 XP and 65% progress ring
- Stage 2 (משמעת יומית) - **Available** with bouncing indicator
- Stages 3-5 - **Locked** with reduced opacity and lock icon

### 4. Click Any Node
Opens a modal showing:
- Stage title, icon, and summary (Hebrew)
- Requirements list
- CTA button to start the stage

## 🎨 Visual Features

### Stage States
1. **Locked** 🔒
   - Grayscale colors
   - 40% opacity
   - Lock icon overlay
   - "השלימו את השלב הקודם" tooltip

2. **Available** ✨
   - Full color (lime accent)
   - Bouncing indicator dot
   - "להתחיל שלב" CTA

3. **In Progress** 🔄
   - Orange/warning color
   - Animated progress ring (conic-gradient)
   - XP counter: "52/80 XP"
   - Shows next actionable steps

4. **Completed** ✅
   - Green/success color
   - Pulsing glow effect
   - Checkmark icon
   - "שתפו את ההישג" CTA

### Animations
- **Path**: Infinite flowing dashed stroke (20s loop)
- **Nodes**: Staggered spring entrance (0.1s delay per stage)
- **Hover**: Scale 1.1x on available/in-progress nodes
- **Progress Ring**: Smooth 0.8s fill animation
- **Completed Glow**: Breathing pulse effect (2s loop)

## 📁 File Structure
```
apps/web/
├── app/(app)/journey/
│   ├── page.tsx           # Main route with mock data
│   ├── StageNode.tsx      # Interactive SVG badge
│   └── README.md          # This file
├── lib/
│   ├── stageEngine.ts     # Business logic
│   ├── path.ts            # SVG path generation
│   ├── tokens.ts          # Design system
│   └── i18n/he.ts         # Hebrew translations
packages/db/prisma/migrations/
└── 20251010100011_add_stage_tables/
    ├── migration.sql      # Table schemas
    └── seed.sql           # 8 Hebrew stages
```

## 🔧 Next Steps to Complete

### High Priority
1. **Supabase RPCs** - Create metrics calculation functions:
   - `rpc_get_metrics(user_id)` → current fitness metrics
   - `rpc_award_xp(user_id, stage_code, delta)` → safe XP updates

2. **React Query Hooks** - Data fetching layer:
   - `useUserStages()` - Fetch user's stage progression
   - `useMetrics()` - Get current metrics with caching
   - `useUpdateStage()` - Mutation for stage actions

3. **Pan/Zoom** - Add gesture controls:
   - Use `@use-gesture/react` for drag/pinch
   - Framer Motion `motion.div` with transform
   - Bounded constraints to canvas edges

4. **StageSheet Component** - Full-featured bottom sheet:
   - Requirement checklist with ✅/❌ indicators
   - Next steps suggestions (Hebrew)
   - Progress visualization
   - Multi-CTA layout (start/log/view)

### Medium Priority
5. **Parallax Background** - Depth layers:
   - Faint grid pattern
   - Particle elements
   - Different scroll speeds

6. **Confetti Animation** - Completion celebration:
   - Lottie file or CSS particles
   - Haptic feedback (vibration)
   - Toast notification

7. **Pro Mode Toggle** - Classic dashboard alternative:
   - Switch in header
   - Card-based layout
   - Same data sources

8. **Personalization Logic** - User-specific stages:
   - Read Profile.goal & Profile.level on first visit
   - Select 5-8 relevant stages from library
   - Insert into user_stage table

### Low Priority
9. **A/B Testing** - Experiment framework:
   - 5 vs 8 stages variant
   - Different stage orders
   - Analytics events

10. **Accessibility** - WCAG AA compliance:
    - Keyboard navigation (arrow keys)
    - Screen reader labels (ARIA)
    - High contrast mode
    - Focus indicators

## 🎯 Mock Data Currently Used

The page uses hardcoded stages to demonstrate functionality:
- 5 stages with realistic Hebrew content
- Mixed states (in_progress, available, locked)
- Realistic XP values (52/80, showing 65% progress)

To connect real data:
1. Create Supabase client hook
2. Fetch from `user_stage` table joined with `stage_library`
3. Replace `MOCK_STAGES` and `MOCK_USER_STAGES` with query data

## 🌍 RTL & Hebrew

All UI is in Hebrew with proper RTL layout:
- `dir="rtl"` on page root
- Right-aligned text
- Mirrored UI elements
- Hebrew font support (system default or load Heebo/Rubik)

## 🎨 Brand Alignment

Colors match existing GymBro theme:
- Background: `#0e0f12` (dark navy)
- Accent: `#E2F163` (lime green)
- Surface: `#14161a`, `#191c21` (elevated panels)
- Success: `#6fe3a1`, Warning: `#ffb020`, Danger: `#ff5a5a`

## 📊 Performance

Current implementation:
- ✅ Smooth 60fps animations (Framer Motion)
- ✅ Minimal re-renders (useMemo for path calculations)
- ✅ SVG for scalability and performance
- ⚠️ Pan/zoom not yet optimized (needs throttling)
- ⚠️ Large canvas may need virtualization for 8+ stages

## 🐛 Known Limitations

1. **Mock Data Only** - Not connected to Supabase yet
2. **No Pan/Zoom** - Static canvas, no gesture handling
3. **No Persistence** - Stage changes not saved
4. **No Metrics** - XP/progress is hardcoded
5. **Simplified Path** - Uses approximation instead of true Bézier arc length

## 📝 License

Part of the GymBro monorepo - internal use only.
