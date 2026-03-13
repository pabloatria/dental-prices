-- Subscribers table
CREATE TABLE subscribers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'premium')),
  subscribed_at TIMESTAMPTZ DEFAULT now(),
  active BOOLEAN NOT NULL DEFAULT true,
  whatsapp_number TEXT
);

CREATE UNIQUE INDEX subscribers_user_unique ON subscribers (user_id) WHERE active = true;
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription"
  ON subscribers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own subscription"
  ON subscribers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own subscription"
  ON subscribers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Service role full access on subscribers"
  ON subscribers USING (auth.role() = 'service_role');

-- Stock alerts table
CREATE TABLE stock_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  active BOOLEAN NOT NULL DEFAULT true,
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX stock_alerts_unique_active
  ON stock_alerts (user_id, product_id, supplier_id) WHERE active = true;
CREATE INDEX stock_alerts_product_supplier
  ON stock_alerts (product_id, supplier_id) WHERE active = true;
ALTER TABLE stock_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own stock alerts"
  ON stock_alerts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own stock alerts"
  ON stock_alerts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own stock alerts"
  ON stock_alerts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Service role full access on stock_alerts"
  ON stock_alerts USING (auth.role() = 'service_role');

-- Restock events table (scrapers write, cron reads)
CREATE TABLE restock_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  detected_at TIMESTAMPTZ DEFAULT now(),
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ
);

CREATE INDEX restock_events_unprocessed
  ON restock_events (processed, detected_at) WHERE processed = false;
ALTER TABLE restock_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on restock_events"
  ON restock_events USING (auth.role() = 'service_role');
