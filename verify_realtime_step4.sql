-- Step 4: Force cache reloads with NOTIFY
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- This forces PostgREST and Realtime to reload their cached schema/config
-- No output expected, but you should see "NOTIFY" success message
