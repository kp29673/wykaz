-- FAZA 1 & 2: Nowe kolumny dla Crossref i DOAJ w journals_master
ALTER TABLE journals_master ADD COLUMN IF NOT EXISTS crossref_subjects jsonb;
ALTER TABLE journals_master ADD COLUMN IF NOT EXISTS crossref_languages text[];
ALTER TABLE journals_master ADD COLUMN IF NOT EXISTS crossref_issn_type text;
ALTER TABLE journals_master ADD COLUMN IF NOT EXISTS crossref_coverage_depth text;
ALTER TABLE journals_master ADD COLUMN IF NOT EXISTS crossref_coverage_type text;
ALTER TABLE journals_master ADD COLUMN IF NOT EXISTS crossref_breakdowns jsonb;
ALTER TABLE journals_master ADD COLUMN IF NOT EXISTS crossref_affiliations jsonb;
ALTER TABLE journals_master ADD COLUMN IF NOT EXISTS crossref_publisher text;

ALTER TABLE journals_master ADD COLUMN IF NOT EXISTS doaj_seal boolean DEFAULT false;
ALTER TABLE journals_master ADD COLUMN IF NOT EXISTS doaj_review_process text;
ALTER TABLE journals_master ADD COLUMN IF NOT EXISTS doaj_plagiarism_check boolean;
ALTER TABLE journals_master ADD COLUMN IF NOT EXISTS doaj_editorial_board_url text;
ALTER TABLE journals_master ADD COLUMN IF NOT EXISTS doaj_author_instructions_url text;
ALTER TABLE journals_master ADD COLUMN IF NOT EXISTS doaj_aims_scope text;
ALTER TABLE journals_master ADD COLUMN IF NOT EXISTS doaj_publication_time_weeks integer;
ALTER TABLE journals_master ADD COLUMN IF NOT EXISTS doaj_keywords text[];
ALTER TABLE journals_master ADD COLUMN IF NOT EXISTS doaj_languages text[];
ALTER TABLE journals_master ADD COLUMN IF NOT EXISTS doaj_updated_at timestamp with time zone;

-- FAZA 3: Osobne kolejki dla Crossref i DOAJ
CREATE TABLE IF NOT EXISTS crossref_enrichment_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id uuid REFERENCES journals_master(id) ON DELETE CASCADE,
  status text DEFAULT 'pending',
  attempts integer DEFAULT 0,
  last_error text,
  created_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  UNIQUE(journal_id)
);

CREATE TABLE IF NOT EXISTS doaj_enrichment_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id uuid REFERENCES journals_master(id) ON DELETE CASCADE,
  status text DEFAULT 'pending',
  attempts integer DEFAULT 0,
  last_error text,
  created_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  UNIQUE(journal_id)
);

-- Indexes dla wydajności
CREATE INDEX IF NOT EXISTS idx_crossref_queue_status ON crossref_enrichment_queue(status);
CREATE INDEX IF NOT EXISTS idx_crossref_queue_created ON crossref_enrichment_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_doaj_queue_status ON doaj_enrichment_queue(status);
CREATE INDEX IF NOT EXISTS idx_doaj_queue_created ON doaj_enrichment_queue(created_at);

-- RLS dla kolejek
ALTER TABLE crossref_enrichment_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE doaj_enrichment_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view crossref queue" ON crossref_enrichment_queue FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert to crossref queue" ON crossref_enrichment_queue FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update crossref queue" ON crossref_enrichment_queue FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete from crossref queue" ON crossref_enrichment_queue FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view doaj queue" ON doaj_enrichment_queue FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert to doaj queue" ON doaj_enrichment_queue FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update doaj queue" ON doaj_enrichment_queue FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete from doaj queue" ON doaj_enrichment_queue FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));