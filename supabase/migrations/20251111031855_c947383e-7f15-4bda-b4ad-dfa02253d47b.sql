-- Create cron_job_runs table for monitoring automatic enrichment
CREATE TABLE IF NOT EXISTS cron_job_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  status TEXT NOT NULL,
  journals_processed INTEGER DEFAULT 0,
  error_message TEXT,
  execution_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_cron_runs_created ON cron_job_runs(created_at DESC);
CREATE INDEX idx_cron_runs_job ON cron_job_runs(job_name);

-- RLS policies
ALTER TABLE cron_job_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view cron runs"
  ON cron_job_runs FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can insert cron runs"
  ON cron_job_runs FOR INSERT
  WITH CHECK (true);

-- Enable extensions for cron
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule WEEKLY cron job (every Sunday at 2:00 AM UTC)
SELECT cron.schedule(
  'auto-enrich-journals-weekly',
  '0 2 * * 0',
  $$
  SELECT
    net.http_post(
        url:='https://wbsmzbpndohahbutywew.supabase.co/functions/v1/auto-enrich-journals',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer <SUPABASE_ANON_KEY>"}'::jsonb,
        body:=concat('{"triggered_at": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);