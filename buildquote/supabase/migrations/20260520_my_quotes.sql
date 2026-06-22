-- ============================================================
-- My Quotes feature — run in Supabase SQL editor
-- ============================================================

-- rfq_drafts: link to builder + store display meta
ALTER TABLE rfq_drafts ADD COLUMN IF NOT EXISTS builder_id uuid REFERENCES builders(id);
ALTER TABLE rfq_drafts ADD COLUMN IF NOT EXISTS supplier_name text;
ALTER TABLE rfq_drafts ADD COLUMN IF NOT EXISTS supplier_email text;
ALTER TABLE rfq_drafts ADD COLUMN IF NOT EXISTS project_reference text;
CREATE INDEX IF NOT EXISTS idx_rfq_drafts_builder ON rfq_drafts(builder_id);

-- rfq_requests: store the user-visible RFQ ID and originating draft
ALTER TABLE rfq_requests ADD COLUMN IF NOT EXISTS rfq_id_short text;
ALTER TABLE rfq_requests ADD COLUMN IF NOT EXISTS draft_id text;

-- RLS: rfq_requests — builders see/update only their own; inserts are open (send route uses anon key)
ALTER TABLE rfq_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Builders can view own rfq requests"
  ON rfq_requests FOR SELECT
  USING (auth.uid() = builder_id);

CREATE POLICY "Anyone can insert rfq requests"
  ON rfq_requests FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Builders can update own rfq requests"
  ON rfq_requests FOR UPDATE
  USING (auth.uid() = builder_id);

-- RLS: rfq_items — accessible only via parent rfq_request ownership
ALTER TABLE rfq_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Builders can view own rfq items"
  ON rfq_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM rfq_requests
      WHERE rfq_requests.id = rfq_items.rfq_id
        AND rfq_requests.builder_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can insert rfq items"
  ON rfq_items FOR INSERT
  WITH CHECK (true);
