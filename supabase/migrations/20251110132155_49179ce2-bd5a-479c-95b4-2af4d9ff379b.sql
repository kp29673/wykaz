-- ============================================
-- NAPRAWIONA MIGRACJA: Bez UNIQUE constraint na openalex_id
-- ============================================

-- KROK 1: Usuń istniejące tabele i VIEW
DROP VIEW IF EXISTS current_wykaz_view CASCADE;
DROP TABLE IF EXISTS journal_rankings CASCADE;
DROP TABLE IF EXISTS journals_master CASCADE;

-- KROK 2: Utwórz nową tabelę journals_master (bez UNIQUE na openalex_id)
CREATE TABLE journals_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  title_2 TEXT,
  issn_print TEXT,
  issn_electronic TEXT,
  issn_print_2 TEXT,
  issn_electronic_2 TEXT,
  issn_l TEXT,
  publisher TEXT,
  country TEXT,
  country_code TEXT,
  medium TEXT,
  openalex_id TEXT, -- USUNIĘTY UNIQUE CONSTRAINT
  host_organization TEXT,
  journal_url TEXT,
  -- OpenAlex enrichment fields
  if_proxy NUMERIC,
  h_index INTEGER,
  is_oa BOOLEAN,
  oa_status TEXT,
  works_count INTEGER,
  cited_by_count INTEGER,
  apc_amount NUMERIC,
  apc_currency TEXT,
  license TEXT,
  avg_time_to_publish_days INTEGER,
  oa_rate NUMERIC,
  preprint_allowed BOOLEAN,
  postprint_allowed BOOLEAN,
  publisher_pdf_allowed BOOLEAN,
  embargo_months INTEGER,
  in_erih_plus BOOLEAN DEFAULT false,
  in_road BOOLEAN DEFAULT false,
  preservation_status BOOLEAN,
  papers_5y INTEGER,
  avg_citations_per_paper NUMERIC,
  composite_score NUMERIC,
  sources_metadata JSONB,
  last_enriched_at TIMESTAMPTZ,
  enrichment_method TEXT,
  openalex_updated_at TIMESTAMPTZ,
  data_provenance JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- KROK 3: Utwórz tabelę journal_rankings (punktacja MEiN per rok)
CREATE TABLE journal_rankings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id TEXT NOT NULL,
  year INTEGER NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  disciplines TEXT[],
  discipline_codes TEXT[],
  published_date DATE NOT NULL,
  source_file TEXT,
  data_source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT fk_journal FOREIGN KEY (journal_id) REFERENCES journals_master(journal_id) ON DELETE CASCADE,
  CONSTRAINT unique_journal_year UNIQUE(journal_id, year)
);

-- KROK 4: Indexy dla wydajności
CREATE INDEX idx_rankings_journal_id ON journal_rankings(journal_id);
CREATE INDEX idx_rankings_year ON journal_rankings(year);
CREATE INDEX idx_rankings_points ON journal_rankings(points);
CREATE INDEX idx_rankings_year_points ON journal_rankings(year, points DESC);
CREATE INDEX idx_master_journal_id ON journals_master(journal_id);
CREATE INDEX idx_master_openalex ON journals_master(openalex_id) WHERE openalex_id IS NOT NULL;
CREATE INDEX idx_master_issn_print ON journals_master(issn_print) WHERE issn_print IS NOT NULL;
CREATE INDEX idx_master_issn_electronic ON journals_master(issn_electronic) WHERE issn_electronic IS NOT NULL;

-- KROK 5: Migruj dane z journals_backup (powstał w poprzedniej migracji)
-- Jeśli journals_backup nie istnieje, użyj journals
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'journals_backup') THEN
    -- Użyj journals_backup
    INSERT INTO journals_master (
      journal_id, title, title_2, issn_print, issn_electronic, issn_print_2, issn_electronic_2,
      issn_l, publisher, country, country_code, medium, openalex_id, host_organization, journal_url,
      if_proxy, h_index, is_oa, oa_status, works_count, cited_by_count, apc_amount, apc_currency,
      license, avg_time_to_publish_days, oa_rate, preprint_allowed, postprint_allowed,
      publisher_pdf_allowed, embargo_months, in_erih_plus, in_road, preservation_status,
      papers_5y, avg_citations_per_paper, composite_score, sources_metadata, last_enriched_at,
      enrichment_method, openalex_updated_at, data_provenance, created_at, updated_at
    )
    SELECT DISTINCT ON (journal_id)
      journal_id, title, title_2, issn_print, issn_electronic, issn_print_2, issn_electronic_2,
      issn_l, publisher, country, country_code, medium, openalex_id, host_organization, journal_url,
      if_proxy, h_index, is_oa, oa_status, works_count, cited_by_count, apc_amount, apc_currency,
      license, avg_time_to_publish_days, oa_rate, preprint_allowed, postprint_allowed,
      publisher_pdf_allowed, embargo_months, in_erih_plus, in_road, preservation_status,
      papers_5y, avg_citations_per_paper, composite_score, sources_metadata, last_enriched_at,
      enrichment_method, openalex_updated_at, data_provenance, created_at, updated_at
    FROM journals_backup
    WHERE journal_id IS NOT NULL AND journal_id != ''
    ORDER BY journal_id, updated_at DESC NULLS LAST, created_at DESC NULLS LAST
    ON CONFLICT (journal_id) DO NOTHING;

    INSERT INTO journal_rankings (
      journal_id, year, points, disciplines, discipline_codes, published_date,
      source_file, data_source, created_at, updated_at
    )
    SELECT 
      journal_id, year, points, disciplines, discipline_codes, published_date,
      source_file, data_source, created_at, updated_at
    FROM journals_backup
    WHERE journal_id IS NOT NULL AND journal_id != ''
    ON CONFLICT (journal_id, year) DO UPDATE SET
      points = EXCLUDED.points,
      disciplines = EXCLUDED.disciplines,
      discipline_codes = EXCLUDED.discipline_codes,
      published_date = EXCLUDED.published_date,
      source_file = EXCLUDED.source_file,
      data_source = EXCLUDED.data_source,
      updated_at = EXCLUDED.updated_at;
  END IF;
END $$;

-- KROK 6: Utwórz VIEW dla aktualnego wykazu (z dropped journals = 0 punktów)
CREATE OR REPLACE VIEW current_wykaz_view AS
WITH latest_year AS (
  SELECT MAX(year) as year FROM journal_rankings
),
current_rankings AS (
  -- Czasopisma z aktualnego wykazu
  SELECT 
    jm.id,
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
    jm.openalex_id,
    jm.host_organization,
    jm.journal_url,
    jm.if_proxy,
    jm.h_index,
    jm.is_oa,
    jm.oa_status,
    jm.works_count,
    jm.cited_by_count,
    jm.apc_amount,
    jm.apc_currency,
    jm.license,
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
    jm.enrichment_method,
    jm.openalex_updated_at,
    jm.data_provenance,
    jm.created_at,
    jm.updated_at,
    jr.id as ranking_id,
    jr.year,
    jr.points,
    jr.disciplines,
    jr.discipline_codes,
    jr.published_date,
    jr.source_file,
    jr.data_source,
    true as in_current_wykaz
  FROM journals_master jm
  INNER JOIN journal_rankings jr ON jr.journal_id = jm.journal_id
  CROSS JOIN latest_year ly
  WHERE jr.year = ly.year
),
dropped_rankings AS (
  -- Czasopisma z poprzedniego roku, których nie ma w aktualnym = 0 punktów
  SELECT 
    jm.id,
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
    jm.openalex_id,
    jm.host_organization,
    jm.journal_url,
    jm.if_proxy,
    jm.h_index,
    jm.is_oa,
    jm.oa_status,
    jm.works_count,
    jm.cited_by_count,
    jm.apc_amount,
    jm.apc_currency,
    jm.license,
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
    jm.enrichment_method,
    jm.openalex_updated_at,
    jm.data_provenance,
    jm.created_at,
    jm.updated_at,
    gen_random_uuid() as ranking_id,
    ly.year as year,
    0 as points,
    jr_prev.disciplines,
    jr_prev.discipline_codes,
    CURRENT_DATE as published_date,
    jr_prev.source_file,
    jr_prev.data_source,
    false as in_current_wykaz
  FROM journals_master jm
  CROSS JOIN latest_year ly
  INNER JOIN journal_rankings jr_prev ON jr_prev.journal_id = jm.journal_id
  WHERE jr_prev.year = ly.year - 1
    AND NOT EXISTS (
      SELECT 1 FROM journal_rankings jr_curr 
      WHERE jr_curr.journal_id = jm.journal_id 
        AND jr_curr.year = ly.year
    )
)
SELECT * FROM current_rankings
UNION ALL
SELECT * FROM dropped_rankings;

-- KROK 7: Dodaj trigger dla auto-update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column_journals()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_journals_master_updated_at
  BEFORE UPDATE ON journals_master
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column_journals();

CREATE TRIGGER update_journal_rankings_updated_at
  BEFORE UPDATE ON journal_rankings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column_journals();

-- KROK 8: Enable RLS na nowych tabelach
ALTER TABLE journals_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_rankings ENABLE ROW LEVEL SECURITY;

-- KROK 9: RLS policies (public read)
CREATE POLICY "Anyone can read journals_master"
  ON journals_master FOR SELECT
  USING (true);

CREATE POLICY "Anyone can read journal_rankings"
  ON journal_rankings FOR SELECT
  USING (true);

-- KROK 10: Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';