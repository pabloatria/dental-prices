-- Category overhaul: Replace 13 categories with 42 standardized dental supply categories
-- Run in Supabase SQL editor

BEGIN;

-- Step 1: Ensure unique constraint on slug for conflict handling
CREATE UNIQUE INDEX IF NOT EXISTS categories_slug_unique ON categories (slug);

-- Step 2: Insert new categories (skip if slug already exists)
INSERT INTO categories (name, slug) VALUES
  ('Acrílicos y materiales de cubeta', 'acrilicos-materiales-cubeta'),
  ('Aleaciones y accesorios', 'aleaciones-accesorios'),
  ('Materiales de articulación', 'materiales-articulacion'),
  ('Fresas y diamantes', 'fresas-diamantes'),
  ('CAD CAM', 'cad-cam'),
  ('Cementos y adhesivos', 'cementos-adhesivos'),
  ('Materiales de reconstrucción', 'materiales-reconstruccion'),
  ('Coronas y cofias', 'coronas-cofias'),
  ('Educación en salud dental', 'educacion-salud-dental'),
  ('Productos de emergencia', 'emergencia'),
  ('Evacuación', 'evacuacion'),
  ('Acabado y pulido', 'acabado-pulido'),
  ('Piezas de mano', 'piezas-de-mano'),
  ('Implantes', 'implantes'),
  ('Materiales de impresión', 'materiales-impresion'),
  ('Control de infecciones clínico', 'control-infecciones-clinico'),
  ('Control de infecciones personal', 'control-infecciones-personal'),
  ('Laboratorio', 'laboratorio'),
  ('Lupas y lámparas', 'lupas-lamparas'),
  ('Bandas matrices', 'bandas-matrices'),
  ('Matrices y cuñas', 'matrices-cunas'),
  ('Jeringas y agujas', 'jeringas-agujas'),
  ('Misceláneos', 'miscelaneos'),
  ('Materiales de mezcla', 'materiales-mezcla'),
  ('Suministros de oficina', 'suministros-oficina'),
  ('Confort y protección del paciente', 'confort-proteccion'),
  ('Productos farmacéuticos', 'productos-farmaceuticos'),
  ('Pernos y postes', 'pernos-postes'),
  ('Preventivos', 'preventivos'),
  ('Materiales de retracción', 'materiales-retraccion'),
  ('Goma dique', 'goma-dique'),
  ('Regalos', 'regalos'),
  ('Ceras', 'ceras')
ON CONFLICT (slug) DO NOTHING;

-- Step 3: Update names of categories that already exist to match new naming
UPDATE categories SET name = 'Anestesia' WHERE slug = 'anestesia';
UPDATE categories SET name = 'Cirugía' WHERE slug = 'cirugia';
UPDATE categories SET name = 'Desechables' WHERE slug = 'desechables';
UPDATE categories SET name = 'Endodoncia' WHERE slug = 'endodoncia';
UPDATE categories SET name = 'Equipamiento' WHERE slug = 'equipamiento';
UPDATE categories SET name = 'Odontología estética' WHERE slug = 'estetica';
UPDATE categories SET name = 'Instrumental' WHERE slug = 'instrumental';
UPDATE categories SET name = 'Ortodoncia' WHERE slug = 'ortodoncia';
UPDATE categories SET name = 'Radiología' WHERE slug = 'radiologia';

-- Step 4: Migrate products from old categories to new ones
-- resinas → cementos-adhesivos
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'cementos-adhesivos')
WHERE category_id = (SELECT id FROM categories WHERE slug = 'resinas');

-- bioseguridad → control-infecciones-clinico
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'control-infecciones-clinico')
WHERE category_id = (SELECT id FROM categories WHERE slug = 'bioseguridad');

-- prevencion → preventivos
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'preventivos')
WHERE category_id = (SELECT id FROM categories WHERE slug = 'prevencion');

-- protesis → laboratorio
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'laboratorio')
WHERE category_id = (SELECT id FROM categories WHERE slug = 'protesis');

-- blanqueamiento → estetica (already exists)
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'estetica')
WHERE category_id = (SELECT id FROM categories WHERE slug = 'blanqueamiento');

-- periodoncia → cirugia (already exists)
UPDATE products SET category_id = (SELECT id FROM categories WHERE slug = 'cirugia')
WHERE category_id = (SELECT id FROM categories WHERE slug = 'periodoncia');

-- Step 5: Delete old categories that no longer exist
DELETE FROM categories WHERE slug IN (
  'resinas', 'bioseguridad', 'prevencion', 'protesis', 'blanqueamiento', 'periodoncia'
);

COMMIT;
