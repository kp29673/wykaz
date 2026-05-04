-- Add Crossref columns to journals_master
ALTER TABLE journals_master 
ADD COLUMN IF NOT EXISTS crossref_total_dois INTEGER,
ADD COLUMN IF NOT EXISTS crossref_current_dois INTEGER,
ADD COLUMN IF NOT EXISTS crossref_backfile_dois INTEGER,
ADD COLUMN IF NOT EXISTS crossref_member_id TEXT,
ADD COLUMN IF NOT EXISTS crossref_updated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS crossref_publisher_location TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_journals_master_crossref_updated_at 
ON journals_master(crossref_updated_at);

CREATE INDEX IF NOT EXISTS idx_journals_master_crossref_member_id 
ON journals_master(crossref_member_id);

-- Create GIN index for data_provenance JSONB queries
CREATE INDEX IF NOT EXISTS idx_journals_master_data_provenance 
ON journals_master USING GIN(data_provenance);

-- Add comment explaining data_provenance structure
COMMENT ON COLUMN journals_master.data_provenance IS 
'JSONB storing per-field source tracking. Structure: {"field_name": {"source": "openalex|crossref|mein_wykaz", "updated_at": "ISO8601", "method": "optional"}}';