-- Create journals table for MEiN data
CREATE TABLE IF NOT EXISTS public.journals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id TEXT,
  title TEXT NOT NULL,
  title_2 TEXT,
  issn_print TEXT,
  issn_electronic TEXT,
  issn_print_2 TEXT,
  issn_electronic_2 TEXT,
  points INTEGER NOT NULL,
  year INTEGER NOT NULL,
  disciplines TEXT[],
  discipline_codes TEXT[],
  source_file TEXT,
  if_proxy NUMERIC,
  h_index INTEGER,
  is_oa BOOLEAN,
  works_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_journals_title ON public.journals USING gin(to_tsvector('simple', title));
CREATE INDEX IF NOT EXISTS idx_journals_issn_print ON public.journals(issn_print);
CREATE INDEX IF NOT EXISTS idx_journals_issn_electronic ON public.journals(issn_electronic);
CREATE INDEX IF NOT EXISTS idx_journals_year ON public.journals(year);
CREATE INDEX IF NOT EXISTS idx_journals_points ON public.journals(points);
CREATE INDEX IF NOT EXISTS idx_journals_disciplines ON public.journals USING gin(disciplines);

-- Enable RLS
ALTER TABLE public.journals ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access (wykaz is public data)
CREATE POLICY "Anyone can read journals"
  ON public.journals
  FOR SELECT
  USING (true);

-- Create updated_at trigger
CREATE TRIGGER update_journals_updated_at
  BEFORE UPDATE ON public.journals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();