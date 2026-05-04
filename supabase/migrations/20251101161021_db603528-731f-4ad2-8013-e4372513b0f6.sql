-- Add cover_url field to literature_items
ALTER TABLE public.literature_items 
ADD COLUMN IF NOT EXISTS cover_url text,
ADD COLUMN IF NOT EXISTS item_category text CHECK (item_category IN ('BOOK', 'ARTICLE', 'LEGAL_ACT')),
ADD COLUMN IF NOT EXISTS legal_act_data jsonb;

-- Add comment explaining the legal_act_data structure
COMMENT ON COLUMN public.literature_items.legal_act_data IS 'JSON structure for legal acts: {act_number: string, act_date: string, journal_year: string, journal_number: string, journal_position: string, isap_url: string}';

-- Update existing records to have item_category
UPDATE public.literature_items 
SET item_category = CASE 
  WHEN isbn IS NOT NULL THEN 'BOOK'
  WHEN doi IS NOT NULL THEN 'ARTICLE'
  ELSE 'BOOK'
END
WHERE item_category IS NULL;