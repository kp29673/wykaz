-- Add new OpenAlex fields to journals_master
ALTER TABLE journals_master 
  ADD COLUMN IF NOT EXISTS i10_index INTEGER,
  ADD COLUMN IF NOT EXISTS is_core BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_in_doaj BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS abbreviated_title TEXT,
  ADD COLUMN IF NOT EXISTS alternate_titles TEXT[],
  ADD COLUMN IF NOT EXISTS apc_prices JSONB,
  ADD COLUMN IF NOT EXISTS apc_usd INTEGER,
  ADD COLUMN IF NOT EXISTS homepage_url TEXT,
  ADD COLUMN IF NOT EXISTS host_organization_lineage TEXT[],
  ADD COLUMN IF NOT EXISTS societies JSONB,
  ADD COLUMN IF NOT EXISTS source_type TEXT,
  ADD COLUMN IF NOT EXISTS counts_by_year JSONB,
  ADD COLUMN IF NOT EXISTS openalex_created_date DATE,
  ADD COLUMN IF NOT EXISTS openalex_updated_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS works_api_url TEXT;

-- Create enrichment log table
CREATE TABLE IF NOT EXISTS openalex_enrichment_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id UUID REFERENCES journals_master(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  method TEXT,
  error_message TEXT,
  fields_updated TEXT[],
  execution_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_enrichment_log_journal ON openalex_enrichment_log(journal_id);
CREATE INDEX IF NOT EXISTS idx_enrichment_log_created ON openalex_enrichment_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_enrichment_log_status ON openalex_enrichment_log(status);

-- Create cooldown tracking table
CREATE TABLE IF NOT EXISTS enrichment_cooldowns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_type TEXT NOT NULL DEFAULT 'admin',
  enrichment_type TEXT NOT NULL,
  last_run_at TIMESTAMP WITH TIME ZONE NOT NULL,
  journals_processed INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cooldowns_type_time ON enrichment_cooldowns(enrichment_type, last_run_at DESC);

-- Enable RLS on new tables
ALTER TABLE openalex_enrichment_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrichment_cooldowns ENABLE ROW LEVEL SECURITY;

-- RLS policies for openalex_enrichment_log
CREATE POLICY "Admins can view enrichment logs"
  ON openalex_enrichment_log
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert enrichment logs"
  ON openalex_enrichment_log
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for enrichment_cooldowns
CREATE POLICY "Admins can view cooldowns"
  ON enrichment_cooldowns
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert cooldowns"
  ON enrichment_cooldowns
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));