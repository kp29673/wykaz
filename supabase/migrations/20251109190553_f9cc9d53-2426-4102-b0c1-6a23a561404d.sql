-- Add enrichment_method column to journals table to track how the journal was enriched
ALTER TABLE public.journals 
ADD COLUMN IF NOT EXISTS enrichment_method TEXT;

-- Add enrichment_method column to openalex_enrichment_queue table
ALTER TABLE public.openalex_enrichment_queue 
ADD COLUMN IF NOT EXISTS enrichment_method TEXT;

-- Add comment to describe possible values
COMMENT ON COLUMN public.journals.enrichment_method IS 'Method used for enrichment: issn_no_hyphen, issn_with_hyphen, title_search, crossref, doaj';
COMMENT ON COLUMN public.openalex_enrichment_queue.enrichment_method IS 'Method used for enrichment: issn_no_hyphen, issn_with_hyphen, title_search, crossref, doaj';