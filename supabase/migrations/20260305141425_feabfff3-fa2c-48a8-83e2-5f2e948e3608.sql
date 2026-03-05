-- Fix 1: Restrict verification_attempts SELECT to admins and own records only
CREATE POLICY "Admins can view all verification attempts"
  ON public.verification_attempts FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own verification attempts"
  ON public.verification_attempts FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Fix 2: Drop overly broad SELECT on push_subscriptions
DROP POLICY IF EXISTS "Service can read all subscriptions" ON public.push_subscriptions;

-- Fix 3: Drop overly broad INSERT on notifications
DROP POLICY IF EXISTS "Service can insert notifications" ON public.notifications;

-- Also drop overly broad INSERT on notification_log (same pattern)
DROP POLICY IF EXISTS "Service can insert logs" ON public.notification_log;