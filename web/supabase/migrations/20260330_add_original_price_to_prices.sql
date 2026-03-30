-- Add original_price to prices table
-- NULL = no sale detected; non-null = supplier is actively running a promotion
ALTER TABLE prices ADD COLUMN IF NOT EXISTS original_price integer;

COMMENT ON COLUMN prices.original_price IS
  'Regular/list price when supplier has a sale active. NULL when no discount. A product is an offer when original_price IS NOT NULL AND original_price > price * 1.10';
