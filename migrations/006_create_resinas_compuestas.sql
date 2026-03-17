-- Create "Resinas compuestas" category and move composite resin products into it
-- Separates composites from "Cementos y adhesivos" which keeps cements, adhesives, ionomers
-- Run in Supabase SQL editor

BEGIN;

-- =====================================================
-- STEP 1: Create the new category
-- =====================================================

INSERT INTO categories (name, slug)
VALUES ('Resinas compuestas', 'resinas-compuestas')
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- STEP 2: Move composite resin products FROM cementos-adhesivos
-- These are products currently in cementos-adhesivos that are actually composites
-- =====================================================

UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'resinas-compuestas')
WHERE category_id = (SELECT id FROM categories WHERE slug = 'cementos-adhesivos')
  AND (
    -- Generic composite/resin terms (exclude "resina 3d" which is CAD/CAM)
    (name ILIKE '%resina%' AND name NOT ILIKE '%resina 3d%' AND name NOT ILIKE '%cemento%resin%')
    OR name ILIKE '%composite%'

    -- Composite brands & product lines
    OR name ILIKE '%filtek%'
    OR name ILIKE '%z350%'
    OR name ILIKE '%z250%'
    OR name ILIKE '%z100%'
    OR name ILIKE '%bulk fill%'
    OR name ILIKE '%omnichroma%'
    OR name ILIKE '%palfique%'
    OR name ILIKE '%estelite%'
    OR name ILIKE '%tokuyama%'
    OR name ILIKE '%simpli%shade%'
    OR name ILIKE '%tetric%'
    OR name ILIKE '%charisma%'
    OR name ILIKE '%herculite%'
    OR name ILIKE '%grandio%'
    OR name ILIKE '%admira%'
    OR name ILIKE '%venus%pearl%'
    OR name ILIKE '%venus%diamond%'
    OR name ILIKE '%beautifil%'
    OR name ILIKE '%gradia%direct%'
    OR name ILIKE '%aura%bulk%'
    OR name ILIKE '%brilliant%'
    OR name ILIKE '%ceram%x%'
    OR name ILIKE '%solare%'
    OR name ILIKE '%spectrum%'
    OR name ILIKE '%point 4%'
    OR name ILIKE '%amelogen%'
    OR name ILIKE '%premise%'
    OR name ILIKE '%empress direct%'
    OR name ILIKE '%ips empress%direct%'
    OR name ILIKE '%evoceram%'
    OR name ILIKE '%synergy%d6%'

    -- Compomers (composite + ionomer hybrids, closer to composites)
    OR name ILIKE '%compómero%'
    OR name ILIKE '%compomero%'

    -- Flowable composites
    OR name ILIKE '%flow%resina%'
    OR name ILIKE '%resina%flow%'
    OR name ILIKE '%filtek%flow%'
    OR name ILIKE '%tetric%flow%'
    OR name ILIKE '%sdr%flow%'
    OR name ILIKE '%surefil%'
  );

-- =====================================================
-- STEP 3: Move composite products from OTHER categories
-- that may have been miscategorized
-- =====================================================

-- From instrumental
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'resinas-compuestas')
WHERE category_id = (SELECT id FROM categories WHERE slug = 'instrumental')
  AND (name ILIKE '%resina%' OR name ILIKE '%filtek%' OR name ILIKE '%z350%' OR name ILIKE '%composite%');

-- From miscelaneos
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'resinas-compuestas')
WHERE category_id = (SELECT id FROM categories WHERE slug = 'miscelaneos')
  AND (name ILIKE '%resina%' OR name ILIKE '%composite%' OR name ILIKE '%filtek%');

-- From equipamiento
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'resinas-compuestas')
WHERE category_id = (SELECT id FROM categories WHERE slug = 'equipamiento')
  AND (name ILIKE '%resina%' OR name ILIKE '%composite%' OR name ILIKE '%filtek%');

-- =====================================================
-- STEP 4: Catch any uncategorized composite products
-- =====================================================

UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'resinas-compuestas')
WHERE category_id IS NULL
  AND (
    (name ILIKE '%resina%' AND name NOT ILIKE '%resina 3d%' AND name NOT ILIKE '%cemento%resin%')
    OR name ILIKE '%composite%'
    OR name ILIKE '%filtek%'
    OR name ILIKE '%z350%'
    OR name ILIKE '%z250%'
    OR name ILIKE '%z100%'
    OR name ILIKE '%bulk fill%'
    OR name ILIKE '%omnichroma%'
    OR name ILIKE '%palfique%'
    OR name ILIKE '%estelite%'
    OR name ILIKE '%tokuyama%'
    OR name ILIKE '%tetric%'
    OR name ILIKE '%charisma%'
    OR name ILIKE '%herculite%'
    OR name ILIKE '%grandio%'
    OR name ILIKE '%admira%'
    OR name ILIKE '%beautifil%'
    OR name ILIKE '%compómero%'
    OR name ILIKE '%compomero%'
  );

COMMIT;
