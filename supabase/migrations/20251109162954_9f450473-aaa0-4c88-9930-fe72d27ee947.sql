-- Add OpenAlex columns to journals table
ALTER TABLE journals 
ADD COLUMN IF NOT EXISTS openalex_id TEXT,
ADD COLUMN IF NOT EXISTS country_code TEXT,
ADD COLUMN IF NOT EXISTS host_organization TEXT,
ADD COLUMN IF NOT EXISTS cited_by_count INTEGER,
ADD COLUMN IF NOT EXISTS openalex_updated_at TIMESTAMP WITH TIME ZONE;

-- Create index for OpenAlex ID for faster lookups
CREATE INDEX IF NOT EXISTS idx_journals_openalex_id ON journals(openalex_id);

-- Create index for country code for filtering
CREATE INDEX IF NOT EXISTS idx_journals_country_code ON journals(country_code);