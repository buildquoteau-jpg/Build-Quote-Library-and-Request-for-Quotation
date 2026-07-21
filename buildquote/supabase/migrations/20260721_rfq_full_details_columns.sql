-- ─────────────────────────────────────────────────────────────────────────────
-- rfq_requests was missing columns for fields that ARE captured on the original
-- RFQ send (builder ABN/phone, PM name/phone, site suburb, date required, site
-- access notes, preferred contact, supplier account number) but were never
-- persisted. app/api/quotes/[id]/pdf/route.ts reconstructs the PDF payload from
-- this table when a builder re-downloads a past RFQ, and hardcoded these to ''
-- because there was nowhere to read them from — producing a visibly thinner
-- FROM box / shorter delivery bar than the PDF that was actually emailed.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE rfq_requests
  ADD COLUMN IF NOT EXISTS builder_abn text,
  ADD COLUMN IF NOT EXISTS builder_phone text,
  ADD COLUMN IF NOT EXISTS pm_name text,
  ADD COLUMN IF NOT EXISTS pm_phone text,
  ADD COLUMN IF NOT EXISTS site_suburb text,
  ADD COLUMN IF NOT EXISTS date_required text,
  ADD COLUMN IF NOT EXISTS site_access_notes text,
  ADD COLUMN IF NOT EXISTS preferred_contact text,
  ADD COLUMN IF NOT EXISTS supplier_account_number text;
