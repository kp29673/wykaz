-- Add data_provenance column to track source of each field
ALTER TABLE journals ADD COLUMN IF NOT EXISTS data_provenance JSONB DEFAULT '{}'::jsonb;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_journals_data_provenance ON journals USING gin(data_provenance);

-- Add comment explaining the column
COMMENT ON COLUMN journals.data_provenance IS 'Tracks the source API for each enriched field (e.g., {"publisher": "crossref", "country": "issn_portal"})';