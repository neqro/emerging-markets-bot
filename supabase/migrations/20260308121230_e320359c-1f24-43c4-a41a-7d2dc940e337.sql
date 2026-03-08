-- pg_cron ve pg_net uzantılarını etkinleştir
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Her 5 dakikada bir auto-scan çalıştır
SELECT cron.schedule(
  'auto-scan-tokens',
  '*/5 * * * *',
  $$
  SELECT
    net.http_post(
        url:='https://udxkvnsdpzymfwdyeaov.supabase.co/functions/v1/analyze-wallets',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkeGt2bnNkcHp5bWZ3ZHllYW92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NjkzNTcsImV4cCI6MjA4ODU0NTM1N30.wJTsS_Auu-M7H0xSNikUsDYe0Y0IQIUmmCcokBWpVWU"}'::jsonb,
        body:='{"action": "auto-scan"}'::jsonb
    ) AS request_id;
  $$
);