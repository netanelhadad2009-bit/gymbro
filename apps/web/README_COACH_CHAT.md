# Coach Chat System Documentation

## Overview

WhatsApp-style real-time messaging between users and their assigned coaches. Features include:
- Real-time message delivery via Supabase Realtime
- Read receipts (single ✓, double ✓✓, colored ✓✓)
- Typing indicators
- Image/audio/file attachments
- Infinite scroll for message history
- Mobile-first, RTL Hebrew UI
- Safe area handling for iOS/Android

---

## Data Model

### Tables

#### `coach_threads`
One thread per coach assignment.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| assignment_id | uuid | FK to coach_assignments (unique) |
| user_id | uuid | FK to auth.users |
| coach_id | uuid | FK to coaches |
| created_at | timestamptz | Creation timestamp |

**RLS**: Members (user or coach) can read/insert

---

#### `coach_chat_messages`
Messages within a thread.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| thread_id | uuid | FK to coach_threads |
| sender_id | uuid | FK to auth.users |
| sender_role | text | 'user' or 'coach' |
| body | text | Message text (nullable if attachment-only) |
| attachment_url | text | Supabase Storage URL |
| attachment_type | text | 'image', 'audio', or 'file' |
| delivered_at | timestamptz | When received by partner |
| read_at | timestamptz | When read by partner |
| edited_at | timestamptz | If edited |
| created_at | timestamptz | Send timestamp |

**RLS**: Members can read/insert/update

---

#### `coach_presence`
Typing indicators and online status.

| Column | Type | Description |
|--------|------|-------------|
| thread_id | uuid | FK to coach_threads |
| user_id | uuid | FK to auth.users |
| role | text | 'user' or 'coach' |
| typing | boolean | Currently typing |
| last_seen | timestamptz | Last activity timestamp |

**Primary key**: (thread_id, user_id)
**RLS**: Members can read/upsert/update

---

### Storage

#### `chat-uploads` bucket
- **Public**: Yes (for viewing)
- **Path**: `{user_id}/{timestamp}-{uuid}.{ext}`
- **Write policy**: Users can upload to their own folder
- **Supported types**: Images (jpg, png, gif, webp), Audio (m4a, mp3, wav), Files (pdf, doc, docx)

---

## API Routes

### `POST /api/chat/thread`
Get or create thread for active assignment.

**Response**:
```json
{
  "ok": true,
  "data": {
    "thread": { ...thread object },
    "messages": [ ...last 40 messages ],
    "hasMore": boolean
  }
}
```

---

### `GET /api/chat/thread?thread_id=xxx&before=timestamp&limit=40`
Load older messages (pagination).

**Query params**:
- `thread_id` (required)
- `before` (ISO timestamp)
- `limit` (default: 40)

**Response**:
```json
{
  "ok": true,
  "data": {
    "messages": [ ...messages ],
    "hasMore": boolean
  }
}
```

---

### `POST /api/chat/send`
Send a message with optional attachment.

**Request**:
```typescript
{
  thread_id: string;
  body?: string; // Text message
  attachment?: {
    name: string;
    type: "image" | "audio" | "file";
    bytes: string; // base64
  };
}
```

**Response**:
```json
{
  "ok": true,
  "data": {
    "message": { ...message object }
  }
}
```

---

### `POST /api/chat/mark-read`
Mark messages as read.

**Request**:
```typescript
{
  thread_id: string;
  message_ids: string[]; // Array of message UUIDs
}
```

**Response**:
```json
{
  "ok": true
}
```

---

### `POST /api/chat/presence`
Update typing status.

**Request**:
```typescript
{
  thread_id: string;
  typing: boolean;
}
```

**Response**:
```json
{
  "ok": true
}
```

---

## Client Hook: `useChat(threadId)`

Custom hook managing chat state and Realtime subscriptions.

**Returns**:
```typescript
{
  messages: ClientMessage[];
  loading: boolean;
  hasMore: boolean;
  sending: boolean;
  send: (text?: string, attachment?: {...}) => Promise<void>;
  loadMore: () => Promise<void>;
  markAsRead: (messageIds: string[]) => Promise<void>;
  setTyping: (typing: boolean) => Promise<void>;
  retry: (messageId: string) => void;
}
```

**Features**:
- Realtime subscription to `coach_chat_messages` (INSERT/UPDATE)
- Optimistic UI for sent messages
- Auto-mark as read when app is visible
- Typing debounce (stops after 3s)
- Error handling with retry

---

## Components

### `ChatScreen`
Main chat container.

**Props**:
```typescript
{
  coachName: string;
  coachAvatar: string | null;
}
```

**Layout**: Grid with 3 rows (header, messages, composer)

---

### `ChatHeader`
Sticky header with coach info and presence.

**Features**:
- Back button
- Coach avatar + name
- Presence indicator:
  - "מקוון עכשיו" (online within 60s)
  - "…מקליד/ה" (typing)
- Menu button (placeholder)

---

### `MessageList`
Scrollable message feed with infinite scroll.

**Features**:
- Date separators ("היום", "אתמול", dd.MM.yyyy)
- Message bubbles:
  - Mine: Lime gradient, right-aligned, rounded-br-sm
  - Theirs: Dark gray, left-aligned, rounded-bl-sm
- Status indicators (mine only):
  - ✓ = sent
  - ✓✓ = delivered (gray)
  - ✓✓ = read (blue)
- Image attachments (rounded preview)
- Empty state with icon
- Load more button

---

### `Composer`
Input area with attachment support.

**Features**:
- Auto-resizing textarea (max 4 lines / 96px)
- Attachment button (opens file picker)
- Send button (appears when text is entered)
- Typing indicator (triggers `setTyping(true)` on input)
- Enter to send, Shift+Enter for newline
- Safe area padding at bottom

---

## Message Flow

### Sending a Message

1. User types and presses send
2. **Optimistic UI**: Message added locally with `status: "sending"`
3. **API call**: `POST /api/chat/send`
4. **Realtime echo**: Supabase broadcasts INSERT event
5. **Update**: Optimistic message replaced with real one, `status: "delivered"`

### Receiving a Message

1. Partner sends message
2. **Realtime**: INSERT event received
3. **Add to UI**: Message appears in list
4. **Auto-mark read**: If app is visible, call `markAsRead([id])`
5. **Update**: Realtime UPDATE sets `read_at`, status changes to "read"

### Typing Indicator

1. User types in composer
2. **Debounce**: Call `setTyping(true)` on input change
3. **Upsert presence**: `POST /api/chat/presence` updates `coach_presence` table
4. **Partner sees**: Realtime subscription updates header ("…מקליד/ה")
5. **Auto-stop**: After 3s of no input, call `setTyping(false)`

---

## Realtime Subscriptions

### Messages Channel
```typescript
supabase
  .channel(`chat:${threadId}`)
  .on('postgres_changes', { event: 'INSERT', table: 'coach_chat_messages' }, handler)
  .on('postgres_changes', { event: 'UPDATE', table: 'coach_chat_messages' }, handler)
  .subscribe();
```

### Presence Channel
```typescript
supabase
  .channel(`presence:${threadId}`)
  .on('postgres_changes', { event: '*', table: 'coach_presence' }, handler)
  .subscribe();
```

---

## Testing Guide

### 1. Create Thread

Navigate to `/coach/chat` - thread auto-created on first visit.

---

### 2. Send Text Message

Type in composer and press Enter or click send button.

**Expected**:
- Message appears instantly (optimistic)
- Status: ✓ → ✓✓ (delivered)
- If partner marks read: ✓✓ (blue)

---

### 3. Send Image

Click attachment button → select image → auto-uploads.

**Expected**:
- Image appears in bubble
- Uploads to `chat-uploads/{user_id}/{filename}`

---

### 4. Typing Indicator

Open chat in two windows (different users/roles).

**Window 1**: Start typing
**Window 2**: Should see "…מקליד/ה" in header

---

### 5. Read Receipts

**Window 1** (User): Send message
**Window 2** (Coach): Open chat while visible

**Expected**:
- Window 1: Status changes ✓ → ✓✓ → ✓✓ (blue)

---

### 6. Infinite Scroll

Send 50+ messages → scroll to top → click "טען הודעות נוספות"

**Expected**:
- Loads previous 40 messages
- Maintains scroll position

---

### 7. Offline/Error

Disable network → send message

**Expected**:
- Message shows error icon (red X)
- Click to retry

---

## Mobile Considerations

### Safe Areas
- Header: `pt-[env(safe-area-inset-top)]`
- Composer: `pb-[calc(env(safe-area-inset-bottom)+12px)]`

### Keyboard Handling
- iOS: Viewport resizes automatically
- Android: Use `h-[100dvh]` for dynamic height

### Touch Gestures
- Scroll to top for infinite scroll
- Pull-to-refresh (future enhancement)

---

## Push Notifications (Scaffold)

### TODO: Integration

Currently, the system is set up for push notifications but requires integration:

1. **Device Token Registration**:
   - Use `@capacitor/push-notifications`
   - Store tokens in `push_subscriptions` table (user_id, token, platform)

2. **Trigger**:
   - Database function/webhook on `coach_chat_messages` INSERT
   - Check if recipient is offline (last_seen > 5min)
   - Send push via APNs/Firebase

3. **Payload**:
   ```json
   {
     "title": "{sender_name}",
     "body": "{message_body}",
     "data": {
       "thread_id": "...",
       "message_id": "..."
     }
   }
   ```

---

## RTL & Accessibility

### RTL Support
- All containers: `dir="rtl"`
- Bubbles align correctly (mine: right, theirs: left)
- Icons/arrows flip appropriately

### Accessibility
- Buttons have `aria-label`
- Keyboard navigation (Enter to send)
- Screen reader friendly (message timestamps, status)

---

## Performance Optimizations

1. **Virtual Scrolling**: Consider `react-virtuoso` for 1000+ messages
2. **Image Lazy Loading**: Lazy load images outside viewport
3. **Debounced Typing**: Only send presence update every 2s
4. **Batch Read Receipts**: Mark multiple messages as read in one call

---

## Future Enhancements

- [ ] Message editing (edit_at timestamp)
- [ ] Message deletion
- [ ] Voice messages (record in Composer)
- [ ] Video attachments
- [ ] Link previews
- [ ] Reply/quote messages
- [ ] Message reactions
- [ ] Search in chat
- [ ] Export chat history

---

## Troubleshooting

### Messages not updating in real-time
- Check Supabase Realtime is enabled
- Verify channel subscription in console
- Ensure RLS policies allow SELECT

### Typing indicator not showing
- Check `coach_presence` table updates
- Verify last_seen within 3 seconds
- Ensure Realtime subscription on presence channel

### Attachments not uploading
- Check `chat-uploads` bucket exists
- Verify storage policies allow INSERT
- Check file size < 50MB

### Read receipts not working
- Verify app is in foreground (document.visibilityState)
- Check `markAsRead` API call succeeds
- Ensure UPDATE event propagates via Realtime

---

**Built with ❤️ for GymBro Chat**
