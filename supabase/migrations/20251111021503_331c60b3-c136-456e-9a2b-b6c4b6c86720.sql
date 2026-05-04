-- Clean all wykaz-related tables before re-import
-- This will remove all existing journal data to ensure consistency

-- First, clean the dependent table
TRUNCATE TABLE openalex_enrichment_queue CASCADE;

-- Then clean the main data tables
TRUNCATE TABLE journal_rankings CASCADE;
TRUNCATE TABLE journals CASCADE;
TRUNCATE TABLE journals_master CASCADE;

-- Verify cleanup
DO $$
BEGIN
  RAISE NOTICE 'Cleanup complete. All wykaz tables have been truncated.';
END $$;