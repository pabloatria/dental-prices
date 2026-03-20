-- Product ratings table (1-5 stars per user per product)
CREATE TABLE product_ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- One rating per user per product
CREATE UNIQUE INDEX product_ratings_user_product ON product_ratings (user_id, product_id);

-- Fast aggregation queries
CREATE INDEX product_ratings_product_id ON product_ratings (product_id);

ALTER TABLE product_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all ratings"
  ON product_ratings FOR SELECT USING (true);
CREATE POLICY "Users can insert own rating"
  ON product_ratings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own rating"
  ON product_ratings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own rating"
  ON product_ratings FOR DELETE USING (auth.uid() = user_id);
