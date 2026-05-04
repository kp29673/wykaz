-- Fix unique constraint to allow journals without ISSN by using journal_id as fallback
-- First, remove duplicates keeping only the most recent entry for each unique combination

-- Step 1: Delete duplicate journals, keeping only the one with the smallest ID (oldest entry)
-- This ensures we keep the original record and remove any accidental duplicates
DELETE FROM journals a
USING journals b
WHERE 
  COALESCE(a.issn_print, a.issn_electronic, a.journal_id) = COALESCE(b.issn_print, b.issn_electronic, b.journal_id)
  AND a.published_date = b.published_date
  AND a.id > b.id;

-- Step 2: Drop old constraint if exists
ALTER TABLE journals 
DROP CONSTRAINT IF EXISTS journals_issn_print_issn_electronic_published_date_key;

-- Step 3: Add new unique constraint that uses journal_id as fallback when both ISSNs are NULL
-- This allows journals without ISSN to be uniquely identified by their journal_id
CREATE UNIQUE INDEX journals_unique_identifier 
ON journals (
  COALESCE(issn_print, issn_electronic, journal_id),
  published_date
) WHERE COALESCE(issn_print, issn_electronic, journal_id) IS NOT NULL;