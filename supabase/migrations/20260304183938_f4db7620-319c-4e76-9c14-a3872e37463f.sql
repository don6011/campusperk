
-- Add deal drop columns to deals table
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS drop_window text CHECK (drop_window IN ('morning', 'afternoon', 'evening'));
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS drop_time timestamp with time zone;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS is_surprise_drop boolean NOT NULL DEFAULT false;

-- Add daily notification count tracking to enforce 2/day limit
CREATE TABLE IF NOT EXISTS public.daily_notification_counts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  notification_date date NOT NULL DEFAULT CURRENT_DATE,
  count integer NOT NULL DEFAULT 1,
  UNIQUE(user_id, notification_date)
);

ALTER TABLE public.daily_notification_counts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service can manage notification counts"
  ON public.daily_notification_counts
  FOR ALL
  USING (true)
  WITH CHECK (true);
