-- Create automatic background enrichment triggers for Crossref, DOAJ, and Wikipedia
-- Similar to the existing OpenAlex auto_fill_queue trigger

-- 1. Crossref auto-fill trigger
CREATE OR REPLACE FUNCTION public.auto_fill_crossref_queue()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  pending_count INTEGER;
  unenriched_count INTEGER;
BEGIN
  -- Count pending items in queue
  SELECT COUNT(*) INTO pending_count 
  FROM crossref_enrichment_queue 
  WHERE status = 'pending';
  
  -- Count unenriched journals
  SELECT COUNT(*) INTO unenriched_count
  FROM journals_master
  WHERE crossref_updated_at IS NULL;
  
  -- If queue is empty and there are unenriched journals, trigger batch processing
  IF pending_count = 0 AND unenriched_count > 0 THEN
    PERFORM net.http_post(
      url := 'https://wbsmzbpndohahbutywew.supabase.co/functions/v1/process-batch-crossref',
      headers := '{"Authorization": "Bearer <SUPABASE_ANON_KEY>", "Content-Type": "application/json"}'::jsonb,
      body := '{"auto_trigger": true}'::jsonb
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_auto_fill_crossref_queue ON crossref_enrichment_queue;

-- Create trigger for Crossref queue
CREATE TRIGGER trigger_auto_fill_crossref_queue
  AFTER UPDATE ON crossref_enrichment_queue
  FOR EACH ROW
  WHEN (OLD.status = 'pending' AND NEW.status = 'completed')
  EXECUTE FUNCTION auto_fill_crossref_queue();

-- 2. DOAJ auto-fill trigger
CREATE OR REPLACE FUNCTION public.auto_fill_doaj_queue()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  pending_count INTEGER;
  unenriched_count INTEGER;
BEGIN
  -- Count pending items in queue
  SELECT COUNT(*) INTO pending_count 
  FROM doaj_enrichment_queue 
  WHERE status = 'pending';
  
  -- Count unenriched journals
  SELECT COUNT(*) INTO unenriched_count
  FROM journals_master
  WHERE doaj_updated_at IS NULL;
  
  -- If queue is empty and there are unenriched journals, trigger batch processing
  IF pending_count = 0 AND unenriched_count > 0 THEN
    PERFORM net.http_post(
      url := 'https://wbsmzbpndohahbutywew.supabase.co/functions/v1/process-batch-doaj',
      headers := '{"Authorization": "Bearer <SUPABASE_ANON_KEY>", "Content-Type": "application/json"}'::jsonb,
      body := '{"auto_trigger": true}'::jsonb
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_auto_fill_doaj_queue ON doaj_enrichment_queue;

-- Create trigger for DOAJ queue
CREATE TRIGGER trigger_auto_fill_doaj_queue
  AFTER UPDATE ON doaj_enrichment_queue
  FOR EACH ROW
  WHEN (OLD.status = 'pending' AND NEW.status = 'completed')
  EXECUTE FUNCTION auto_fill_doaj_queue();

-- 3. Wikipedia auto-fill trigger
CREATE OR REPLACE FUNCTION public.auto_fill_wikipedia_queue()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  pending_count INTEGER;
  unchecked_count INTEGER;
BEGIN
  -- Count pending items in queue
  SELECT COUNT(*) INTO pending_count 
  FROM wikipedia_enrichment_queue 
  WHERE status = 'pending';
  
  -- Count unchecked journals
  SELECT COUNT(*) INTO unchecked_count
  FROM journals_master
  WHERE wikipedia_checked_at IS NULL;
  
  -- If queue is empty and there are unchecked journals, trigger batch processing
  IF pending_count = 0 AND unchecked_count > 0 THEN
    PERFORM net.http_post(
      url := 'https://wbsmzbpndohahbutywew.supabase.co/functions/v1/process-batch-wikipedia',
      headers := '{"Authorization": "Bearer <SUPABASE_ANON_KEY>", "Content-Type": "application/json"}'::jsonb,
      body := '{"auto_trigger": true}'::jsonb
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_auto_fill_wikipedia_queue ON wikipedia_enrichment_queue;

-- Create trigger for Wikipedia queue
CREATE TRIGGER trigger_auto_fill_wikipedia_queue
  AFTER UPDATE ON wikipedia_enrichment_queue
  FOR EACH ROW
  WHEN (OLD.status = 'pending' AND NEW.status = 'completed')
  EXECUTE FUNCTION auto_fill_wikipedia_queue();