-- Re-categorize existing products based on product name keywords
-- Products in broad categories get moved to more specific ones
-- Run in Supabase SQL editor

BEGIN;

-- ===== From "Instrumental" to more specific categories =====

-- Fresas → fresas-diamantes
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'fresas-diamantes')
WHERE category_id = (SELECT id FROM categories WHERE slug = 'instrumental')
  AND (lower(name) LIKE '%fresa%' OR lower(name) LIKE '%diamante%' OR lower(name) LIKE '%bur %' OR lower(name) LIKE '%burs %');

-- Piezas de mano
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'piezas-de-mano')
WHERE category_id = (SELECT id FROM categories WHERE slug = 'instrumental')
  AND (lower(name) LIKE '%pieza de mano%' OR lower(name) LIKE '%turbina%' OR lower(name) LIKE '%contraangulo%'
       OR lower(name) LIKE '%contra angulo%' OR lower(name) LIKE '%contra-angulo%' OR lower(name) LIKE '%micromotor%'
       OR lower(name) LIKE '%handpiece%');

-- Matrices y cunas
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'matrices-cunas')
WHERE category_id = (SELECT id FROM categories WHERE slug = 'instrumental')
  AND (lower(name) LIKE '%matriz%' OR lower(name) LIKE '%cuña%' OR lower(name) LIKE '%cuna%'
       OR lower(name) LIKE '%tofflemire%');

-- Acabado y pulido
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'acabado-pulido')
WHERE category_id = (SELECT id FROM categories WHERE slug = 'instrumental')
  AND (lower(name) LIKE '%pulido%' OR lower(name) LIKE '%pulir%' OR lower(name) LIKE '%acabado%'
       OR lower(name) LIKE '%disco%soflex%' OR lower(name) LIKE '%copa de goma%');

-- ===== From "Equipamiento" to more specific categories =====

-- Radiologia
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'radiologia')
WHERE category_id = (SELECT id FROM categories WHERE slug = 'equipamiento')
  AND (lower(name) LIKE '%radiogra%' OR lower(name) LIKE '%rayos x%' OR lower(name) LIKE '%sensor intraoral%'
       OR lower(name) LIKE '%rx %' OR lower(name) LIKE '%panoramic%');

-- Lupas y lamparas
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'lupas-lamparas')
WHERE category_id = (SELECT id FROM categories WHERE slug = 'equipamiento')
  AND (lower(name) LIKE '%lupa%' OR lower(name) LIKE '%lampara%' OR lower(name) LIKE '%lámpara%'
       OR lower(name) LIKE '%fotocur%' OR lower(name) LIKE '%luz led%');

-- Control infecciones clinico
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'control-infecciones-clinico')
WHERE category_id = (SELECT id FROM categories WHERE slug = 'equipamiento')
  AND (lower(name) LIKE '%autoclave%' OR lower(name) LIKE '%esteriliz%' OR lower(name) LIKE '%ultrason%');

-- Evacuacion
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'evacuacion')
WHERE category_id = (SELECT id FROM categories WHERE slug = 'equipamiento')
  AND (lower(name) LIKE '%compresor%' OR lower(name) LIKE '%succion%' OR lower(name) LIKE '%succión%'
       OR lower(name) LIKE '%aspirador%' OR lower(name) LIKE '%bomba de vacio%');

-- ===== From "Desechables" to more specific categories =====

-- Control infecciones personal (guantes, mascarillas)
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'control-infecciones-personal')
WHERE category_id = (SELECT id FROM categories WHERE slug = 'desechables')
  AND (lower(name) LIKE '%guante%' OR lower(name) LIKE '%mascarilla%' OR lower(name) LIKE '%gorro%'
       OR lower(name) LIKE '%protector facial%' OR lower(name) LIKE '%cofia%');

-- Jeringas y agujas
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'jeringas-agujas')
WHERE category_id = (SELECT id FROM categories WHERE slug = 'desechables')
  AND (lower(name) LIKE '%jeringa%' OR lower(name) LIKE '%aguja%' OR lower(name) LIKE '%carpule%');

-- Goma dique
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'goma-dique')
WHERE category_id = (SELECT id FROM categories WHERE slug = 'desechables')
  AND (lower(name) LIKE '%dique%' OR lower(name) LIKE '%rubber dam%' OR lower(name) LIKE '%clamp%');

-- ===== From "Endodoncia" — extract implant-related products =====
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'implantes')
WHERE category_id = (SELECT id FROM categories WHERE slug = 'endodoncia')
  AND (lower(name) LIKE '%implante%' AND lower(name) NOT LIKE '%endodo%');

-- Pernos y postes from endodoncia
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'pernos-postes')
WHERE category_id = (SELECT id FROM categories WHERE slug = 'endodoncia')
  AND (lower(name) LIKE '%poste%' OR lower(name) LIKE '%perno%' OR lower(name) LIKE '%fiber post%');

-- ===== From "Cirugia" — extract implant-related products =====
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'implantes')
WHERE category_id = (SELECT id FROM categories WHERE slug = 'cirugia')
  AND (lower(name) LIKE '%implante%' OR lower(name) LIKE '%pilar%' OR lower(name) LIKE '%abutment%');

-- ===== From "Odontologia estetica" — move non-estetica products =====
-- Preventivos (blanqueamiento casero, fluor)
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'preventivos')
WHERE category_id = (SELECT id FROM categories WHERE slug = 'estetica')
  AND (lower(name) LIKE '%fluor%' OR lower(name) LIKE '%flúor%' OR lower(name) LIKE '%pasta dental%'
       OR lower(name) LIKE '%cepillo%' OR lower(name) LIKE '%enjuague%');

COMMIT;
