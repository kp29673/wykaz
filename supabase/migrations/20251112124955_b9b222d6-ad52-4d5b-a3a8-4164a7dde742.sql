-- Clean up stuck processing records older than 10 minutes
-- Reset them to pending with incremented attempts counter

UPDATE crossref_enrichment_queue
SET status = 'pending', 
    attempts = attempts + 1
WHERE status = 'processing' 
  AND created_at < NOW() - INTERVAL '10 minutes';

UPDATE doaj_enrichment_queue
SET status = 'pending', 
    attempts = attempts + 1
WHERE status = 'processing' 
  AND created_at < NOW() - INTERVAL '10 minutes';

UPDATE wikipedia_enrichment_queue
SET status = 'pending', 
    attempts = attempts + 1
WHERE status = 'processing' 
  AND created_at < NOW() - INTERVAL '10 minutes';