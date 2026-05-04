-- Configure cron jobs for PHASE 2: Weekly Maintenance Mode

-- Crossref: Every Friday at 04:00 AM
SELECT cron.schedule(
  'crossref-weekly-maintenance',
  '0 4 * * 5',
  $$
  SELECT
    net.http_post(
        url:='https://wbsmzbpndohahbutywew.supabase.co/functions/v1/auto-enrich-crossref',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer <SUPABASE_ANON_KEY>"}'::jsonb,
        body:='{"mode": "maintenance"}'::jsonb
    ) as request_id;
  $$
);

-- DOAJ: Every Saturday at 03:00 AM
SELECT cron.schedule(
  'doaj-weekly-maintenance',
  '0 3 * * 6',
  $$
  SELECT
    net.http_post(
        url:='https://wbsmzbpndohahbutywew.supabase.co/functions/v1/auto-enrich-doaj',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer <SUPABASE_ANON_KEY>"}'::jsonb,
        body:='{"mode": "maintenance"}'::jsonb
    ) as request_id;
  $$
);

-- Wikipedia: Every Saturday at 05:00 AM
SELECT cron.schedule(
  'wikipedia-weekly-maintenance',
  '0 5 * * 6',
  $$
  SELECT
    net.http_post(
        url:='https://wbsmzbpndohahbutywew.supabase.co/functions/v1/auto-enrich-wikipedia',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer <SUPABASE_ANON_KEY>"}'::jsonb,
        body:='{"mode": "maintenance"}'::jsonb
    ) as request_id;
  $$
);