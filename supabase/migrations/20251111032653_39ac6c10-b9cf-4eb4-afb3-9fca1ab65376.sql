-- Fix search_path for auto_fill_queue function
CREATE OR REPLACE FUNCTION auto_fill_queue()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;