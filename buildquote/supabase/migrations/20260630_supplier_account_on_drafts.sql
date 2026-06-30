-- Persist the full supplier snapshot on a draft so supplier name, email and
-- account number survive navigation away from /rfq (e.g. the /library round-trip).
--
-- A quote is a point-in-time document: we snapshot the supplier's details onto
-- the draft rather than only re-fetching from builder_suppliers, so the account
-- number quoted is the one true at build time and survives the supplier card
-- later being edited or deleted. supplier_id is also stored for traceability.

ALTER TABLE rfq_drafts
  ADD COLUMN IF NOT EXISTS supplier_account_number text,
  ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES builder_suppliers(id) ON DELETE SET NULL;
