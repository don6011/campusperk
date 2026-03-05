
-- Fix 1: Remove public SELECT on waitlist_signups
DROP POLICY IF EXISTS "Anyone can read waitlist" ON public.waitlist_signups;

-- Fix 2: Remove direct INSERT policy on campus_points and add server-validated RPC
DROP POLICY IF EXISTS "Users can insert own campus points" ON public.campus_points;

-- Create SECURITY DEFINER RPC for awarding points
CREATE OR REPLACE FUNCTION public.award_campus_points(p_action text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_points integer;
  v_campus_id uuid;
  v_user_id uuid;
  v_week_start date;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Whitelist of valid actions and their canonical point values
  v_points := CASE p_action
    WHEN 'signup' THEN 50
    WHEN 'deal_redeemed' THEN 20
    WHEN 'referral' THEN 40
    WHEN 'deal_submission' THEN 25
    WHEN 'partner_added' THEN 100
    ELSE NULL
  END;

  IF v_points IS NULL THEN
    RAISE EXCEPTION 'Invalid action: %', p_action;
  END IF;

  -- Get user's campus_id from their profile
  SELECT campus_id INTO v_campus_id FROM profiles WHERE id = v_user_id;
  IF v_campus_id IS NULL THEN
    RETURN; -- No campus, silently skip
  END IF;

  -- Calculate week start (Monday)
  v_week_start := date_trunc('week', now())::date;

  INSERT INTO campus_points (user_id, campus_id, action, points, week_start)
  VALUES (v_user_id, v_campus_id, p_action, v_points, v_week_start);
END;
$$;

-- Add a CHECK constraint as secondary guard
ALTER TABLE public.campus_points ADD CONSTRAINT campus_points_value_check CHECK (points > 0 AND points <= 1000);
