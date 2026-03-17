-- Click events table for affiliate link tracking
-- Run in Supabase SQL editor

CREATE TABLE click_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  url TEXT NOT NULL,
  referrer TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX click_events_created_at ON click_events (created_at DESC);
CREATE INDEX click_events_product_supplier ON click_events (product_id, supplier_id);

-- No RLS needed — this table is written by service role only (API route)
-- and read by admin queries only
ALTER TABLE click_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on click_events"
  ON click_events USING (auth.role() = 'service_role');
