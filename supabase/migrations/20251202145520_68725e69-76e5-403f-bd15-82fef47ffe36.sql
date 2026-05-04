-- Drop enrichment queue tables
DROP TABLE IF EXISTS openalex_enrichment_queue CASCADE;
DROP TABLE IF EXISTS crossref_enrichment_queue CASCADE;
DROP TABLE IF EXISTS doaj_enrichment_queue CASCADE;
DROP TABLE IF EXISTS wikipedia_enrichment_queue CASCADE;
DROP TABLE IF EXISTS enrichment_cooldowns CASCADE;

-- Drop auto-enrichment functions (this also drops any dependent triggers)
DROP FUNCTION IF EXISTS queue_for_enrichment() CASCADE;
DROP FUNCTION IF EXISTS auto_fill_queue() CASCADE;