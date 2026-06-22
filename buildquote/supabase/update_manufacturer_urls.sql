-- Update website_url for demo manufacturer landing pages
-- Hosted as static HTML at buildquote.com.au/manufacturers/<slug>/
-- Project: oxvhmulxuvlfjyjzleki

UPDATE manufacturers SET website_url = 'https://buildquote.com.au/manufacturers/compform-building-products/'
  WHERE slug = 'compform-building-products';

UPDATE manufacturers SET website_url = 'https://buildquote.com.au/manufacturers/bq-aquashield-waterproofing/'
  WHERE slug = 'bq-aquashield-waterproofing';

UPDATE manufacturers SET website_url = 'https://buildquote.com.au/manufacturers/bq-inform-building-products/'
  WHERE slug = 'bq-inform-building-products';

UPDATE manufacturers SET website_url = 'https://buildquote.com.au/manufacturers/bq-fibreline-building-products/'
  WHERE slug = 'bq-fibreline-building-products';

UPDATE manufacturers SET website_url = 'https://buildquote.com.au/manufacturers/bq-timberlock-pergola-systems/'
  WHERE slug = 'bq-timberlock-pergola-systems';

-- Verify:
-- SELECT slug, website_url FROM manufacturers ORDER BY name;
