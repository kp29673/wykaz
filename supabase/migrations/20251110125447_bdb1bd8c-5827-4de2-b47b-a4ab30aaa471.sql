-- Step 1: Remove duplicate records, keep only the most recent one for each (journal_id, year)
DELETE FROM journals
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY journal_id, year 
             ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
           ) AS rn
    FROM journals
    WHERE journal_id IS NOT NULL
  ) t
  WHERE t.rn > 1
);

-- Step 2: Add unique constraint to prevent future duplicates
ALTER TABLE journals 
ADD CONSTRAINT unique_journal_pbn_year 
UNIQUE (journal_id, year);