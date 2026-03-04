
-- Table: push_devices (FCM tokens for native push)
CREATE TABLE public.push_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  platform text NOT NULL CHECK (platform IN ('ios', 'android')),
  fcm_token text UNIQUE NOT NULL,
  device_label text,
  created_at timestamptz DEFAULT now(),
  last_seen timestamptz DEFAULT now()
);

ALTER TABLE public.push_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own devices" ON public.push_devices
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service can read all devices" ON public.push_devices
  FOR SELECT TO authenticated
  USING (true);

-- Table: notification_preferences
CREATE TABLE public.notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  deal_drops boolean DEFAULT true,
  trending_deals boolean DEFAULT true,
  ending_soon boolean DEFAULT true,
  local_deals boolean DEFAULT true,
  savings_alerts boolean DEFAULT true,
  frequency text DEFAULT 'instant' CHECK (frequency IN ('instant', 'daily_digest')),
  quiet_hours_enabled boolean DEFAULT true,
  quiet_start time DEFAULT '22:00',
  quiet_end time DEFAULT '08:00',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own preferences" ON public.notification_preferences
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Table: notification_log
CREATE TABLE public.notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  type text,
  title text,
  body text,
  sent_at timestamptz DEFAULT now(),
  status text DEFAULT 'sent'
);

ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own logs" ON public.notification_log
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service can insert logs" ON public.notification_log
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can manage logs" ON public.notification_log
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
