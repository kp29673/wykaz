-- Krok 1: Utworzenie tabeli metadanych wykazów
CREATE TABLE wykazy_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year_identifier TEXT NOT NULL UNIQUE,
  published_date DATE NOT NULL,
  valid_from DATE NOT NULL,
  valid_to DATE,
  wykaz_version TEXT,
  source_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Krok 2: Dodanie indeksów
CREATE INDEX idx_wykazy_published_date ON wykazy_metadata(published_date);
CREATE INDEX idx_wykazy_valid_period ON wykazy_metadata(valid_from, valid_to);

-- Krok 3: Wstawienie początkowych danych (2019-2024)
INSERT INTO wykazy_metadata (year_identifier, published_date, valid_from, wykaz_version, notes) VALUES
  ('2024', '2024-01-05', '2024-01-05', NULL, 'Wykaz sporządzony na podstawie projektu KEN z 29.06.2023'),
  ('2023', '2023-07-17', '2023-07-17', NULL, 'Rozszerzony wykaz'),
  ('2021-v3', '2021-12-21', '2021-12-21', 'v3', 'Korekta i sprostowanie'),
  ('2021-v2', '2021-12-01', '2021-12-01', 'v2', 'Aktualizacja'),
  ('2021-v1', '2021-02-18', '2021-02-18', 'v1', 'Pierwszy wykaz 2021'),
  ('2019', '2019-12-18', '2019-12-18', NULL, 'Wykaz bazowy');

-- Krok 4: Automatyczne obliczanie okresów valid_to
UPDATE wykazy_metadata wm
SET valid_to = (
  SELECT MIN(w2.published_date) - INTERVAL '1 day'
  FROM wykazy_metadata w2
  WHERE w2.published_date > wm.published_date
);

-- Krok 5: Modyfikacja journal_rankings - dodanie powiązań z wykazami
ALTER TABLE journal_rankings 
  ADD COLUMN wykaz_id UUID REFERENCES wykazy_metadata(id),
  ADD COLUMN wykaz_identifier TEXT;

-- Krok 6: Indeksy dla journal_rankings
CREATE INDEX idx_journal_rankings_wykaz ON journal_rankings(wykaz_id);
CREATE INDEX idx_journal_rankings_identifier ON journal_rankings(wykaz_identifier);

-- Krok 7: Migracja istniejących danych - powiązanie z wykazami na podstawie year i published_date
UPDATE journal_rankings jr
SET 
  wykaz_id = wm.id,
  wykaz_identifier = wm.year_identifier
FROM wykazy_metadata wm
WHERE jr.year = CAST(SPLIT_PART(wm.year_identifier, '-', 1) AS INTEGER)
  AND jr.published_date = wm.published_date;

-- Krok 8: Dla rekordów bez dopasowania - próba dopasowania po roku
UPDATE journal_rankings jr
SET 
  wykaz_id = wm.id,
  wykaz_identifier = wm.year_identifier
FROM wykazy_metadata wm
WHERE jr.wykaz_id IS NULL
  AND jr.year = CAST(SPLIT_PART(wm.year_identifier, '-', 1) AS INTEGER)
  AND wm.wykaz_version IS NULL;

-- Krok 9: Usunięcie starego widoku i utworzenie nowego z okresami obowiązywania
DROP VIEW IF EXISTS current_wykaz_view;

CREATE VIEW current_wykaz_view AS
SELECT 
  jm.*,
  jr.id as ranking_id,
  jr.year,
  jr.points,
  jr.disciplines,
  jr.discipline_codes,
  jr.published_date,
  jr.wykaz_identifier,
  wm.valid_from as wykaz_valid_from,
  wm.valid_to as wykaz_valid_to,
  wm.wykaz_version,
  wm.notes as wykaz_notes,
  (wm.valid_to IS NULL) as in_current_wykaz
FROM journals_master jm
LEFT JOIN journal_rankings jr ON jr.journal_id = jm.journal_id
LEFT JOIN wykazy_metadata wm ON wm.id = jr.wykaz_id
WHERE wm.valid_to IS NULL OR wm.id = (
  SELECT id FROM wykazy_metadata 
  ORDER BY published_date DESC LIMIT 1
);

-- Krok 10: Dodanie RLS dla wykazy_metadata
ALTER TABLE wykazy_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read wykazy_metadata"
ON wykazy_metadata FOR SELECT
TO public
USING (true);

-- Krok 11: Poprawienie błędnych dat w istniejących danych
UPDATE journal_rankings 
SET published_date = '2024-01-05'
WHERE year = 2024 AND published_date = '2024-01-01';

UPDATE journal_rankings 
SET published_date = '2019-12-18'
WHERE year = 2019 AND published_date = '2019-01-01';