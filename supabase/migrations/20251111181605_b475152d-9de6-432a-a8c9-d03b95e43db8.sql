-- Add Wikipedia/Wikidata columns to journals_master
ALTER TABLE journals_master
ADD COLUMN IF NOT EXISTS wikidata_id TEXT,
ADD COLUMN IF NOT EXISTS wikipedia_url TEXT,
ADD COLUMN IF NOT EXISTS wikipedia_lang TEXT,
ADD COLUMN IF NOT EXISTS wikipedia_title TEXT,
ADD COLUMN IF NOT EXISTS wikipedia_checked_at TIMESTAMPTZ;

-- Create index for wikidata_id
CREATE INDEX IF NOT EXISTS idx_journals_master_wikidata ON journals_master(wikidata_id);

-- Update data_provenance structure to track Wikipedia sources
COMMENT ON COLUMN journals_master.wikidata_id IS 'Wikidata Q-ID for the journal';
COMMENT ON COLUMN journals_master.wikipedia_url IS 'URL to Wikipedia article about the journal';
COMMENT ON COLUMN journals_master.wikipedia_lang IS 'Language code of Wikipedia article (pl, en, etc.)';
COMMENT ON COLUMN journals_master.wikipedia_title IS 'Wikipedia article title';
COMMENT ON COLUMN journals_master.wikipedia_checked_at IS 'Last time Wikipedia/Wikidata was checked';