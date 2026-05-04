-- Clean up stuck enrichment queue entries
DELETE FROM openalex_enrichment_queue 
WHERE status = 'processing' 
  AND created_at < NOW() - INTERVAL '10 minutes';

-- Reset failed entries to pending
UPDATE openalex_enrichment_queue 
SET status = 'pending', 
    attempts = 0,
    last_error = NULL
WHERE status = 'failed';