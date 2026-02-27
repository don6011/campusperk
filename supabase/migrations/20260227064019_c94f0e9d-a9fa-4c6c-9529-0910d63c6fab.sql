
SELECT cron.schedule(
  'daily-deal-ingestion',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://jttcpewdibbczdnutmme.supabase.co/functions/v1/ingest-deals',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0dGNwZXdkaWJiY3pkbnV0bW1lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNTI3MTgsImV4cCI6MjA4NjkyODcxOH0.AEMRbIWP4pR86Ov24R1k_Bx3JYa7WCrwX0OUBrU40xw"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
