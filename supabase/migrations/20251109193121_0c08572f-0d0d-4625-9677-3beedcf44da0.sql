-- Add new columns for comprehensive journal data enrichment

-- Normalization and basic metadata
ALTER TABLE journals ADD COLUMN IF NOT EXISTS issn_l TEXT;
ALTER TABLE journals ADD COLUMN IF NOT EXISTS publisher TEXT;
ALTER TABLE journals ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE journals ADD COLUMN IF NOT EXISTS medium TEXT;

-- DOAJ fields (Open Access)
ALTER TABLE journals ADD COLUMN IF NOT EXISTS oa_status TEXT;
ALTER TABLE journals ADD COLUMN IF NOT EXISTS license TEXT;
ALTER TABLE journals ADD COLUMN IF NOT EXISTS apc_amount NUMERIC;
ALTER TABLE journals ADD COLUMN IF NOT EXISTS apc_currency TEXT;
ALTER TABLE journals ADD COLUMN IF NOT EXISTS journal_url TEXT;

-- Crossref metrics
ALTER TABLE journals ADD COLUMN IF NOT EXISTS avg_time_to_publish_days INTEGER;

-- Unpaywall aggregated data
ALTER TABLE journals ADD COLUMN IF NOT EXISTS oa_rate NUMERIC;

-- Sherpa Romeo policies
ALTER TABLE journals ADD COLUMN IF NOT EXISTS preprint_allowed BOOLEAN;
ALTER TABLE journals ADD COLUMN IF NOT EXISTS postprint_allowed BOOLEAN;
ALTER TABLE journals ADD COLUMN IF NOT EXISTS publisher_pdf_allowed BOOLEAN;
ALTER TABLE journals ADD COLUMN IF NOT EXISTS embargo_months INTEGER;

-- Indexing flags
ALTER TABLE journals ADD COLUMN IF NOT EXISTS in_erih_plus BOOLEAN DEFAULT FALSE;
ALTER TABLE journals ADD COLUMN IF NOT EXISTS in_road BOOLEAN DEFAULT FALSE;
ALTER TABLE journals ADD COLUMN IF NOT EXISTS preservation_status BOOLEAN;

-- Additional metrics (5-year window)
ALTER TABLE journals ADD COLUMN IF NOT EXISTS papers_5y INTEGER;
ALTER TABLE journals ADD COLUMN IF NOT EXISTS avg_citations_per_paper NUMERIC;

-- Composite score for ranking
ALTER TABLE journals ADD COLUMN IF NOT EXISTS composite_score NUMERIC;

-- Metadata and tracking
ALTER TABLE journals ADD COLUMN IF NOT EXISTS sources_metadata JSONB;
ALTER TABLE journals ADD COLUMN IF NOT EXISTS last_enriched_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_journals_issn_l ON journals(issn_l);
CREATE INDEX IF NOT EXISTS idx_journals_oa_status ON journals(oa_status);
CREATE INDEX IF NOT EXISTS idx_journals_in_erih_plus ON journals(in_erih_plus);
CREATE INDEX IF NOT EXISTS idx_journals_apc_amount ON journals(apc_amount);
CREATE INDEX IF NOT EXISTS idx_journals_composite_score ON journals(composite_score);
CREATE INDEX IF NOT EXISTS idx_journals_country ON journals(country);