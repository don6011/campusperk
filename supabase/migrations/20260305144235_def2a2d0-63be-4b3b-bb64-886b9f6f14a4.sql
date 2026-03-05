-- Fix: Drop overpermissive ALL policy on daily_notification_counts
-- Edge functions use service_role which bypasses RLS, so no write policy needed
DROP POLICY IF EXISTS "Service can manage notification counts" ON public.daily_notification_counts;

-- Add user-scoped SELECT so users can see their own count
CREATE POLICY "Users can view own notification counts"
  ON public.daily_notification_counts FOR SELECT TO authenticated
  USING (auth.uid() = user_id);