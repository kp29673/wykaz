-- Fix security warning: Set search_path for queue_for_enrichment function
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
$$ LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public;