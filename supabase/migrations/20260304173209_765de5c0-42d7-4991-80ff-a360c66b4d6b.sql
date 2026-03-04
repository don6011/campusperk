
-- Schedule notify-expiring-deals every 30 minutes
SELECT cron.schedule(
  'notify-expiring-deals-cron',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://jttcpewdibbczdnutmme.supabase.co/functions/v1/notify-expiring-deals',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0dGNwZXdkaWJiY3pkbnV0bW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNTI3MTgsImV4cCI6MjA4NjkyODcxOH0.AEMRbIWP4pR86Ov24R1k_Bx3JYa7WCrwX0OUBrU40xw"}'::jsonb,
    body := concat('{"time": "', now(), '"}')::jsonb
  ) AS request_id;
  $$
);

-- Schedule notify-trending-deals every 15 minutes
SELECT cron.schedule(
  'notify-trending-deals-cron',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://jttcpewdibbczdnutmme.supabase.co/functions/v1/notify-trending-deals',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0dGNwZXdkaWJiY3pkbnV0bW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNTI3MTgsImV4cCI6MjA4NjkyODcxOH0.AEMRbIWP4pR86Ov24R1k_Bx3JYa7WCrwX0OUBrU40xw"}'::jsonb,
    body := concat('{"time": "', now(), '"}')::jsonb
  ) AS request_id;
  $$
);
