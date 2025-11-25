-- ============================================
-- Subscription RLS Policies
-- Date: 2025-11-25
-- ============================================
-- This migration enables Row Level Security on the Subscription table
-- and creates policies to ensure users can only access their own subscriptions.
-- ============================================

-- Enable Row Level Security on Subscription table
ALTER TABLE public."Subscription" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can SELECT their own subscription rows
CREATE POLICY "subscription_select_own"
ON public."Subscription"
FOR SELECT
USING ("userId" = auth.uid()::text);

-- Policy: Users can INSERT subscription rows for themselves
CREATE POLICY "subscription_insert_own"
ON public."Subscription"
FOR INSERT
WITH CHECK ("userId" = auth.uid()::text);

-- Policy: Users can UPDATE their own subscription rows
CREATE POLICY "subscription_update_own"
ON public."Subscription"
FOR UPDATE
USING ("userId" = auth.uid()::text)
WITH CHECK ("userId" = auth.uid()::text);

-- ============================================
-- VERIFICATION (run manually after applying):
-- ============================================
-- Check RLS is enabled:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'Subscription';
--
-- Check policies exist:
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'Subscription';
-- ============================================
