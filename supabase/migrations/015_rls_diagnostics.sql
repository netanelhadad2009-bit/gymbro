-- 015_rls_diagnostics.sql
-- RLS diagnostic tools for ai_messages table (developer-only)

-- Always drop the view first to avoid column rename issues
DROP VIEW IF EXISTS public.v_ai_messages_rls_status;

-- View: RLS status on ai_messages
CREATE VIEW public.v_ai_messages_rls_status AS
SELECT
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'ai_messages';