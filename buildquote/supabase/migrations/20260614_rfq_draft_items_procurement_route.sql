-- Add procurement_route to rfq_draft_items so the sourcing channel survives
-- the MFP → BuildQuote round-trip and can be used to show split-RFQ grouping.

ALTER TABLE rfq_draft_items
  ADD COLUMN IF NOT EXISTS procurement_route TEXT;
