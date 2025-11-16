-- Step 6: Live end-to-end test with current user

-- First, get your current user ID
SELECT auth.uid() as current_user_id;

-- Insert a test message (replace YOUR_USER_ID with the output from above)
INSERT INTO public.ai_messages (user_id, role, content)
VALUES (
  auth.uid(),
  'user',
  'Realtime test message at ' || NOW()::text
)
RETURNING id, role, content, created_at;

-- You should see the RETURNING output with the inserted message ID
-- AND if realtime is working, your browser console should show:
-- [RT] ✉️  event: INSERT <message_id>... (user)
-- [RT] 📨 Triggering onInsert callback
