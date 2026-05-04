-- Add unique constraint on journal_id to prevent duplicate queue entries
ALTER TABLE openalex_enrichment_queue 
ADD CONSTRAINT unique_journal_queue UNIQUE (journal_id);