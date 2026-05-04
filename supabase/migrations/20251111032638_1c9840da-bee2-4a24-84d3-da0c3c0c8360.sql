-- Fix foreign key constraint to reference journals_master instead of journals
ALTER TABLE openalex_enrichment_queue
DROP CONSTRAINT IF EXISTS openalex_enrichment_queue_journal_id_fkey;

ALTER TABLE openalex_enrichment_queue
ADD CONSTRAINT openalex_enrichment_queue_journal_id_fkey
FOREIGN KEY (journal_id) REFERENCES journals_master(id) ON DELETE CASCADE;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_queue_status ON openalex_enrichment_queue(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_queue_journal ON openalex_enrichment_queue(journal_id);

-- Create function to automatically trigger batch processing when queue is empty
CREATE OR REPLACE FUNCTION auto_fill_queue()
RETURNS TRIGGER AS $$
DECLARE
  pending_count INTEGER;
  unenriched_count INTEGER;
BEGIN
  -- Count pending items in queue
  SELECT COUNT(*) INTO pending_count 
  FROM openalex_enrichment_queue 
  WHERE status = 'pending';
  
  -- Count unenriched journals
  SELECT COUNT(*) INTO unenriched_count
  FROM journals_master
  WHERE openalex_id IS NULL;
  
  -- If queue is empty and there are unenriched journals, trigger batch processing
  IF pending_count = 0 AND unenriched_count > 0 THEN
    PERFORM net.http_post(
      url := 'https://wbsmzbpndohahbutywew.supabase.co/functions/v1/process-batch-enrichment',
      headers := '{"Authorization": "Bearer <SUPABASE_ANON_KEY>", "Content-Type": "application/json"}'::jsonb,
      body := '{"auto_trigger": true}'::jsonb
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger that fires when a queue item is completed
DROP TRIGGER IF EXISTS trigger_auto_fill_queue ON openalex_enrichment_queue;
CREATE TRIGGER trigger_auto_fill_queue
AFTER UPDATE ON openalex_enrichment_queue
FOR EACH ROW
WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
EXECUTE FUNCTION auto_fill_queue();