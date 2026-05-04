-- Phase 1: Database migration for full date support and data sources

-- Add new columns
ALTER TABLE journals 
ADD COLUMN IF NOT EXISTS published_date DATE,
ADD COLUMN IF NOT EXISTS data_source TEXT;

-- Migrate existing year data to published_date (January 1st of each year as default)
UPDATE journals 
SET published_date = (year || '-01-01')::DATE
WHERE published_date IS NULL;

-- Make published_date NOT NULL after migration
ALTER TABLE journals 
ALTER COLUMN published_date SET NOT NULL;

-- Remove duplicates before adding constraint
DELETE FROM journals a 
USING journals b
WHERE a.id < b.id 
  AND COALESCE(a.issn_print, '') = COALESCE(b.issn_print, '')
  AND COALESCE(a.issn_electronic, '') = COALESCE(b.issn_electronic, '')
  AND a.published_date = b.published_date;

-- Drop old unique constraint if exists and add new one
ALTER TABLE journals 
DROP CONSTRAINT IF EXISTS unique_journal_year;

ALTER TABLE journals 
ADD CONSTRAINT unique_journal_published_date 
UNIQUE (issn_print, issn_electronic, published_date);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_journals_published_date ON journals(published_date DESC);

-- Create enrichment queue table
CREATE TABLE IF NOT EXISTS openalex_enrichment_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id UUID REFERENCES journals(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  attempts INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_queue_status ON openalex_enrichment_queue(status);
CREATE INDEX IF NOT EXISTS idx_queue_journal ON openalex_enrichment_queue(journal_id);

-- RLS policies for enrichment queue
ALTER TABLE openalex_enrichment_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view enrichment queue"
ON openalex_enrichment_queue
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert to enrichment queue"
ON openalex_enrichment_queue
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update enrichment queue"
ON openalex_enrichment_queue
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete from enrichment queue"
ON openalex_enrichment_queue
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for enrichment queue
ALTER PUBLICATION supabase_realtime ADD TABLE openalex_enrichment_queue;

-- Trigger to automatically queue journals for enrichment
CREATE OR REPLACE FUNCTION queue_for_enrichment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.openalex_id IS NULL THEN
    INSERT INTO openalex_enrichment_queue (journal_id, status)
    VALUES (NEW.id, 'pending')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_journal_insert
AFTER INSERT ON journals
FOR EACH ROW
EXECUTE FUNCTION queue_for_enrichment();