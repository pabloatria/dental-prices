-- Add email newsletter opt-in to subscribers
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS email_newsletter boolean DEFAULT true;

COMMENT ON COLUMN subscribers.email_newsletter IS
  'User opted in to receive email updates: blog posts, deals digest (biweekly), and product updates';
