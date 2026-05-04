-- Create Wikipedia enrichment queue table
CREATE TABLE wikipedia_enrichment_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id UUID REFERENCES journals_master(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  last_error TEXT,
  attempts INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(journal_id)
);

-- Create indexes
CREATE INDEX idx_wikipedia_queue_status ON wikipedia_enrichment_queue(status);
CREATE INDEX idx_wikipedia_queue_journal ON wikipedia_enrichment_queue(journal_id);
CREATE INDEX idx_wikipedia_queue_completed ON wikipedia_enrichment_queue(completed_at) WHERE completed_at IS NOT NULL;

-- Enable RLS
ALTER TABLE wikipedia_enrichment_queue ENABLE ROW LEVEL SECURITY;

-- Admins can view queue
CREATE POLICY "Admins can view wikipedia queue"
  ON wikipedia_enrichment_queue FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can insert to queue
CREATE POLICY "Admins can insert to wikipedia queue"
  ON wikipedia_enrichment_queue FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update queue
CREATE POLICY "Admins can update wikipedia queue"
  ON wikipedia_enrichment_queue FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete from queue
CREATE POLICY "Admins can delete from wikipedia queue"
  ON wikipedia_enrichment_queue FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role can do everything
CREATE POLICY "Service role can manage wikipedia queue"
  ON wikipedia_enrichment_queue FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);