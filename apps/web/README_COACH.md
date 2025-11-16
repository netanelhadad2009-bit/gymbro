# Personal Coach System Documentation

## Overview

The Personal Coach system enables GymBro users to interact with their assigned coach through a comprehensive mobile-first interface. Users can view coach profiles, book/manage sessions, send messages, submit progress check-ins, and complete tasks assigned by their coach.

## Architecture

### Tech Stack
- **Framework**: Next.js 14 (App Router)
- **UI**: TailwindCSS + shadcn/ui + Framer Motion
- **Backend**: Supabase (Postgres + Realtime + Storage)
- **Auth**: Supabase Auth with RLS policies
- **Validation**: Zod schemas

### Key Features
- Mobile-first responsive design with RTL Hebrew support
- Sticky shell layout (fixed header/footer, scrollable content)
- Realtime message updates via Supabase Realtime
- Optimistic UI updates for tasks and check-ins
- Safe area inset handling for PWA/mobile views

---

## Data Model

### Tables

#### `coaches`
Stores coach profile information.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| full_name | text | Coach's full name |
| avatar_url | text | Profile picture URL |
| bio | text | Biography/description |
| credentials | text | Certifications/qualifications |
| rating | numeric | Rating (0-5) |
| languages | text[] | Languages spoken |
| tz | text | Timezone (default: Asia/Jerusalem) |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update timestamp |

**RLS**: Anyone can view coaches (for browsing)

---

#### `coach_assignments`
Links users to their coaches.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | Foreign key to auth.users |
| coach_id | uuid | Foreign key to coaches |
| status | text | 'active', 'pending', or 'ended' |
| started_at | timestamptz | Assignment start time |
| ended_at | timestamptz | Assignment end time (nullable) |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update timestamp |

**Constraints**:
- Only one active assignment per user (unique index)

**RLS**: Users can view/update their own assignments

---

#### `coach_messages`
Stores chat messages between users and coaches.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| assignment_id | uuid | Foreign key to coach_assignments |
| sender | text | 'user' or 'coach' |
| content | text | Message content |
| attachments | jsonb | Array of attachment metadata |
| created_at | timestamptz | Message timestamp |

**RLS**: Users can view/insert messages for their assignments

**Realtime**: Subscribed for live updates

---

#### `coach_tasks`
Tasks assigned by coaches to users.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| assignment_id | uuid | Foreign key to coach_assignments |
| title | text | Task title |
| description | text | Detailed description (nullable) |
| due_date | date | Due date (nullable) |
| created_by | text | 'coach' or 'system' |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update timestamp |

**RLS**: Users can view tasks for their assignments

---

#### `coach_task_completions`
Tracks task completion by users.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| task_id | uuid | Foreign key to coach_tasks |
| user_id | uuid | Foreign key to auth.users |
| completed_at | timestamptz | Completion timestamp |
| note | text | Optional completion note |
| created_at | timestamptz | Creation timestamp |

**Constraints**:
- One completion per task per user (unique index)

**RLS**: Users can manage their own completions

---

#### `coach_sessions`
Scheduled coaching sessions.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| assignment_id | uuid | Foreign key to coach_assignments |
| start_t | timestamptz | Session start time |
| end_t | timestamptz | Session end time |
| kind | text | 'video', 'in_person', or 'gym' |
| meet_url | text | Video meeting URL (nullable) |
| location | text | Physical location (nullable) |
| status | text | 'scheduled', 'completed', or 'canceled' |
| notes | text | Session notes (nullable) |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update timestamp |

**Constraints**:
- end_t must be after start_t

**RLS**: Users can view/create/update sessions for their assignments

---

#### `checkins`
User progress check-ins.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| assignment_id | uuid | Foreign key to coach_assignments |
| user_id | uuid | Foreign key to auth.users |
| date | date | Check-in date |
| weight_kg | numeric | Weight in kg (nullable) |
| mood | int2 | Mood rating 0-5 (nullable) |
| energy | int2 | Energy level 0-5 (nullable) |
| note | text | User notes (nullable) |
| photos | text[] | Array of photo URLs |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update timestamp |

**RLS**: Users can manage their own check-ins

---

### Storage Buckets

#### `checkin-photos`
- **Access**: Public read, authenticated write
- **Path structure**: `{user_id}/{filename}`
- **RLS**: Users can only upload/delete their own photos

---

## API Routes

All API routes return JSON with the format:
```json
{
  "ok": true,
  "data": { ... }
}
```

Or on error:
```json
{
  "error": "Error message",
  "details": { ... }
}
```

### `POST /api/coach/checkins`
Create a new check-in.

**Request body**:
```typescript
{
  assignment_id: string;
  date: string; // YYYY-MM-DD
  weight_kg?: number; // 0-500
  mood?: number; // 0-5
  energy?: number; // 0-5
  note?: string; // max 1000 chars
  photos?: string[]; // max 3 URLs
}
```

**Response**: Created check-in object

---

### `GET /api/coach/checkins?assignment_id=xxx&limit=6`
Get check-ins for an assignment.

**Query params**:
- `assignment_id` (required): Assignment UUID
- `limit` (optional): Number of check-ins to return (default: 6)

**Response**: Array of check-in objects

---

### `POST /api/coach/tasks/{taskId}/toggle`
Toggle task completion.

**Request body**:
```typescript
{
  note?: string; // Optional completion note
}
```

**Response**:
```json
{
  "ok": true,
  "data": {
    "isCompleted": boolean
  }
}
```

---

### `POST /api/coach/sessions`
Create a new session.

**Request body**:
```typescript
{
  assignment_id: string;
  start_t: string; // ISO 8601 datetime
  end_t: string; // ISO 8601 datetime
  kind: "video" | "in_person" | "gym";
  meet_url?: string; // For video sessions
  location?: string; // For in-person/gym
  notes?: string; // max 1000 chars
}
```

**Validation**:
- `end_t` must be after `start_t`
- No overlapping sessions
- For video sessions without `meet_url`, a placeholder is generated

**Response**: Created session object

---

### `GET /api/coach/sessions?assignment_id=xxx`
Get sessions for an assignment.

**Query params**:
- `assignment_id` (required): Assignment UUID

**Response**: Array of session objects

---

### `POST /api/coach/messages`
Send a message to the coach.

**Request body**:
```typescript
{
  assignment_id: string;
  content: string; // 1-5000 chars
  attachments?: any[]; // Optional attachments
}
```

**Response**: Created message object

---

### `GET /api/coach/messages?assignment_id=xxx&limit=20`
Get messages for an assignment.

**Query params**:
- `assignment_id` (required): Assignment UUID
- `limit` (optional): Number of messages (default: 20)

**Response**: Array of message objects (newest first)

---

## Server Utilities

Located in `lib/coach/queries.ts`:

### `getActiveAssignment(userId: string)`
Get the active coach assignment for a user.

**Returns**: `CoachAssignment | null`

---

### `getCoachProfile(assignmentId: string)`
Get coach profile with assignment details.

**Returns**:
```typescript
{
  coach: Coach;
  assignment: CoachAssignment;
  responseTime: string; // e.g., "בד\"כ בתוך 4 שעות"
}
```

---

### `getUpcomingSession(assignmentId: string)`
Get the next scheduled session within 7 days.

**Returns**: `CoachSession | null`

---

### `getTasks(assignmentId: string, range: "today" | "week")`
Get tasks with completion status.

**Returns**: `CoachTaskWithCompletion[]`

---

### `getLatestCheckins(assignmentId: string, limit: number)`
Get recent check-ins (newest first).

**Returns**: `Checkin[]`

---

### `getMessagePreview(assignmentId: string, limit: number)`
Get recent messages (newest first).

**Returns**: `CoachMessage[]`

---

### `hasSessionOverlap(assignmentId: string, startTime: string, endTime: string, excludeSessionId?: string)`
Check if a time slot overlaps with existing sessions.

**Returns**: `boolean`

---

## Components

### Page Components

#### `app/(app)/coach/page.tsx` (Server)
Main coach page. Fetches all data server-side and passes to client component.

**Features**:
- Checks for authenticated user
- Fetches active assignment
- Shows "No Coach" state if no assignment
- Fetches all data in parallel for performance

---

#### `CoachPageClient.tsx` (Client)
Client component with sticky shell layout and interactivity.

**Layout**:
- Grid: `grid-rows-[auto_1fr_auto]`
- Top: Sticky header with back button
- Middle: Scrollable content area
- Bottom: Sticky action bar (Chat, Book, Check-in)

**Features**:
- Optimistic UI updates
- Sheet management
- Analytics logging
- Router navigation

---

### Feature Components

#### `CoachSummary`
Displays coach profile card with avatar, credentials, rating, and languages.

**Props**:
```typescript
{
  coach: Coach;
  responseTime: string;
  onSendMessage: () => void;
}
```

**Features**:
- Bio modal (bottom sheet)
- Response time indicator
- Action buttons

---

#### `UpcomingSession`
Shows next scheduled session or empty state.

**Props**:
```typescript
{
  session: CoachSession | null;
  onBookSession: () => void;
}
```

**Features**:
- Session type icons (video/in-person/gym)
- Date/time formatting (Hebrew)
- Join/Navigate actions
- "Soon" indicator (within 1 hour)

---

#### `Tasks`
Task list with toggle completion and filtering.

**Props**:
```typescript
{
  tasks: CoachTaskWithCompletion[];
  onToggle: (taskId: string, isCompleted: boolean) => Promise<void>;
}
```

**Features**:
- Filter: Today / Week
- Optimistic UI updates
- Overdue highlighting
- Checkboxes with animations

---

#### `Checkins`
Latest check-in display with stats grid.

**Props**:
```typescript
{
  checkins: Checkin[];
  onAddCheckin: () => void;
}
```

**Features**:
- Weight, mood, energy display
- Photo grid (up to 3)
- Notes preview
- History count

---

#### `MessagePreview`
Chat preview with Realtime updates.

**Props**:
```typescript
{
  assignmentId: string;
  initialMessages: CoachMessage[];
}
```

**Features**:
- Realtime subscription
- User/coach message bubbles
- Time formatting
- "Open full chat" CTA

---

#### `Resources`
Coach-shared materials (PDFs, videos, links).

**Props**:
```typescript
{
  resources?: Resource[];
}
```

**Features**:
- Type icons (pdf/video/link)
- External link handling
- Hidden if empty

---

### Sheet Components

#### `AddCheckinSheet`
Modal for creating check-ins.

**Features**:
- Weight input (kg)
- Mood selector (emoji buttons 1-5)
- Energy selector (numbered buttons 1-5)
- Notes textarea
- Photo upload (up to 3)
- Form validation

---

#### `BookSessionSheet`
Modal for booking sessions.

**Features**:
- Session type selector (video/in-person/gym)
- Date picker (min: today)
- Time picker
- Duration dropdown
- Conditional location field
- Notes textarea
- Validation

---

## Testing Guide

### 1. Database Setup

Run the migration:
```bash
supabase migration up
```

This creates all tables, indexes, RLS policies, and seeds a sample coach.

---

### 2. Create Test Assignment

In Supabase SQL editor or your app:

```sql
INSERT INTO coach_assignments (user_id, coach_id, status)
VALUES (
  'YOUR_USER_ID',
  '00000000-0000-0000-0000-000000000001', -- Sample coach
  'active'
);
```

---

### 3. Test Features

#### View Coach Page
Navigate to `/coach` - should display coach profile and all sections.

#### Create Check-in
1. Click "צ'ק-אין חדש" button
2. Fill weight, mood, energy, note
3. Upload photos (optional)
4. Submit
5. Check-in should appear immediately (optimistic UI)

#### Toggle Task
1. Click on a task checkbox
2. Should toggle instantly (optimistic UI)
3. Verify in database

#### Book Session
1. Click "הזמן" in bottom bar
2. Select session type
3. Choose date/time
4. Add location (if in-person/gym)
5. Submit
6. Page refreshes with new session

#### Send Message
1. Click "צ'אט" button
2. Redirected to chat page (stub)

---

### 4. Realtime Testing

Open two browser windows:
1. Window 1: Coach page
2. Window 2: Supabase SQL editor

Insert a message:
```sql
INSERT INTO coach_messages (assignment_id, sender, content)
VALUES ('YOUR_ASSIGNMENT_ID', 'coach', 'Test message');
```

Window 1 should update instantly without refresh.

---

## Analytics Events

Logged when `NEXT_PUBLIC_LOG_UI=1`:

- `coach_view` - Page view
- `coach_task_complete` - Task toggled
- `coach_checkin_create` - Check-in created
- `coach_session_create` - Session booked

---

## Mobile Considerations

### Safe Areas
- Header: `pt-[env(safe-area-inset-top)]`
- Bottom bar: `pb-[calc(env(safe-area-inset-bottom)+12px)]`

### Sticky Shell
- Uses `h-[100dvh]` for dynamic viewport height
- Only middle section scrolls
- `overscroll-contain` prevents scroll chaining

### RTL Support
- All containers have `dir="rtl"`
- Icons/text align properly
- Back button on left (visual right in RTL)

---

## Future Enhancements

### Planned Features
- [ ] Full chat interface with threading
- [ ] Session rescheduling
- [ ] Coach change requests
- [ ] Issue reporting
- [ ] Photo upload to Supabase Storage
- [ ] Video provider integration (Zoom, Google Meet)
- [ ] Push notifications for messages/sessions
- [ ] Check-in history view
- [ ] Task notes on completion

### Integration TODOs
- Video meeting provider (currently placeholder URLs)
- Photo storage (currently in-memory, needs Supabase Storage)
- Calendar sync (iCal/Google Calendar)
- Payment/subscription handling

---

## Troubleshooting

### No coach displayed
- Check `coach_assignments` table for active assignment
- Verify `coach_id` exists in `coaches` table
- Check RLS policies are enabled

### Tasks not toggling
- Check network tab for API errors
- Verify `coach_task_completions` RLS policies
- Check assignment belongs to user

### Sessions not creating
- Check for overlapping sessions
- Verify `start_t < end_t`
- Check location provided for in-person/gym

### Realtime not working
- Verify Supabase Realtime is enabled
- Check channel subscription in browser console
- Ensure assignment ID is correct

---

## File Structure

```
apps/web/
├── app/(app)/coach/
│   ├── page.tsx                    # Server component
│   ├── CoachPageClient.tsx         # Client component
│   ├── chat/page.tsx               # Chat stub
│   └── book/page.tsx               # Booking stub
├── components/coach/
│   ├── CoachSummary.tsx
│   ├── UpcomingSession.tsx
│   ├── Tasks.tsx
│   ├── Checkins.tsx
│   ├── MessagePreview.tsx
│   ├── Resources.tsx
│   ├── AddCheckinSheet.tsx
│   └── BookSessionSheet.tsx
├── app/api/coach/
│   ├── checkins/route.ts
│   ├── tasks/[taskId]/toggle/route.ts
│   ├── sessions/route.ts
│   └── messages/route.ts
├── lib/
│   ├── coach/queries.ts            # Server utilities
│   └── schemas/coach.ts            # Types & validation
└── supabase/migrations/
    └── 008_coach_system.sql        # Database schema

```

---

## Support

For issues or questions:
1. Check this README
2. Review TypeScript types in `lib/schemas/coach.ts`
3. Check API route implementations
4. Review RLS policies in migration file

---

**Built with ❤️ for GymBro**
