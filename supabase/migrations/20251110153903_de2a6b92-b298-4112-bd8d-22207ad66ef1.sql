-- Drop old current_wykaz_view if exists
DROP VIEW IF EXISTS current_wykaz_view;

-- Create updated current_wykaz_view that shows latest wykaz + 0-point journals
CREATE VIEW current_wykaz_view AS
WITH latest_wykaz AS (
  SELECT id, published_date, year_identifier, valid_from, valid_to
  FROM wykazy_metadata 
  ORDER BY published_date DESC 
  LIMIT 1
),
previous_wykaz AS (
  SELECT id
  FROM wykazy_metadata
  ORDER BY published_date DESC
  LIMIT 2
  OFFSET 0
),
all_relevant_journals AS (
  -- Journals from latest two wykazy (current + previous)
  SELECT DISTINCT journal_id 
  FROM journal_rankings
  WHERE wykaz_id IN (SELECT id FROM previous_wykaz)
)
SELECT 
  jm.journal_id,
  jm.title,
  jm.title_2,
  jm.issn_print,
  jm.issn_electronic,
  jm.issn_print_2,
  jm.issn_electronic_2,
  jm.issn_l,
  jm.publisher,
  jm.country,
  jm.country_code,
  jm.medium,
  jm.journal_url,
  jm.host_organization,
  jm.openalex_id,
  jm.if_proxy,
  jm.h_index,
  jm.is_oa,
  jm.oa_status,
  jm.works_count,
  jm.cited_by_count,
  jm.apc_amount,
  jm.apc_currency,
  jm.avg_time_to_publish_days,
  jm.oa_rate,
  jm.preprint_allowed,
  jm.postprint_allowed,
  jm.publisher_pdf_allowed,
  jm.embargo_months,
  jm.in_erih_plus,
  jm.in_road,
  jm.preservation_status,
  jm.papers_5y,
  jm.avg_citations_per_paper,
  jm.composite_score,
  jm.sources_metadata,
  jm.last_enriched_at,
  jm.openalex_updated_at,
  jm.enrichment_method,
  jm.created_at,
  jm.updated_at,
  jr.id as ranking_id,
  COALESCE(jr.points, 0) as points,
  jr.disciplines,
  jr.discipline_codes,
  EXTRACT(YEAR FROM lw.published_date)::integer as year,
  lw.published_date,
  lw.year_identifier as wykaz_identifier,
  lw.valid_from as wykaz_valid_from,
  lw.valid_to as wykaz_valid_to,
  (lw.valid_to IS NULL) as in_current_wykaz
FROM journals_master jm
CROSS JOIN latest_wykaz lw
LEFT JOIN journal_rankings jr 
  ON jm.journal_id = jr.journal_id 
  AND jr.wykaz_id = lw.id
WHERE jm.journal_id IN (SELECT journal_id FROM all_relevant_journals);