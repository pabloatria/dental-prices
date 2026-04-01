-- Shopping cart table
CREATE TABLE IF NOT EXISTS cart_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE CASCADE NOT NULL,
  price_snapshot integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS cart_items_unique ON cart_items(user_id, product_id, supplier_id);

ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own cart" ON cart_items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cart" ON cart_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own cart" ON cart_items
  FOR DELETE USING (auth.uid() = user_id);

-- Add source column to click_events
ALTER TABLE click_events ADD COLUMN IF NOT EXISTS source varchar(20);
