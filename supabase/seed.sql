-- seed.sql
-- Default data for Printorama

-- ============================================================
-- DROPDOWN OPTIONS: Job Statuses
-- ============================================================
INSERT INTO dropdown_options (category, label, sort_order) VALUES
  ('JOB_STATUS', 'RECEIVED', 1),
  ('JOB_STATUS', 'PENDING', 2),
  ('JOB_STATUS', 'PRINTING', 3),
  ('JOB_STATUS', 'COMPLETE', 4),
  ('JOB_STATUS', 'FAILED', 5),
  ('JOB_STATUS', 'CANCELLED', 6)
ON CONFLICT (category, label) DO NOTHING;

-- ============================================================
-- DROPDOWN OPTIONS: Filament Types
-- ============================================================
INSERT INTO dropdown_options (category, label, sort_order) VALUES
  ('FILAMENT_TYPE', 'PLA', 1),
  ('FILAMENT_TYPE', 'PETG', 2),
  ('FILAMENT_TYPE', 'ABS', 3),
  ('FILAMENT_TYPE', 'TPU', 4),
  ('FILAMENT_TYPE', 'Nylon', 5),
  ('FILAMENT_TYPE', 'Resin', 6)
ON CONFLICT (category, label) DO NOTHING;

-- ============================================================
-- DROPDOWN OPTIONS: Filament Colors
-- ============================================================
INSERT INTO dropdown_options (category, label, sort_order) VALUES
  ('FILAMENT_COLOR', 'Black', 1),
  ('FILAMENT_COLOR', 'White', 2),
  ('FILAMENT_COLOR', 'Blue', 3),
  ('FILAMENT_COLOR', 'Red', 4),
  ('FILAMENT_COLOR', 'Green', 5),
  ('FILAMENT_COLOR', 'Gray', 6),
  ('FILAMENT_COLOR', 'Orange', 7),
  ('FILAMENT_COLOR', 'Clear', 8)
ON CONFLICT (category, label) DO NOTHING;

-- ============================================================
-- DROPDOWN OPTIONS: Printer Locations
-- ============================================================
INSERT INTO dropdown_options (category, label, sort_order) VALUES
  ('PRINTER_LOCATION', 'Lab 310, Shelf A', 1),
  ('PRINTER_LOCATION', 'Lab 310, Shelf B', 2),
  ('PRINTER_LOCATION', 'Lab 310, Shelf C', 3),
  ('PRINTER_LOCATION', 'Lab 312, Shelf A', 4),
  ('PRINTER_LOCATION', 'Lab 312, Shelf B', 5)
ON CONFLICT (category, label) DO NOTHING;

-- ============================================================
-- PRINTER BRANDS
-- ============================================================
INSERT INTO printer_brands (id, name, sort_order) VALUES
  (gen_random_uuid(), 'Prusa', 1),
  (gen_random_uuid(), 'Bambu Lab', 2),
  (gen_random_uuid(), 'Creality', 3),
  (gen_random_uuid(), 'Anycubic', 4)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- PRINTER MODELS
-- ============================================================
-- We need the brand IDs. Use a DO block for safe inserts.
DO $$
DECLARE
  prusa_id UUID;
  bambu_id UUID;
  creality_id UUID;
  anycubic_id UUID;
BEGIN
  SELECT id INTO prusa_id FROM printer_brands WHERE name = 'Prusa';
  SELECT id INTO bambu_id FROM printer_brands WHERE name = 'Bambu Lab';
  SELECT id INTO creality_id FROM printer_brands WHERE name = 'Creality';
  SELECT id INTO anycubic_id FROM printer_brands WHERE name = 'Anycubic';

  INSERT INTO printer_models (name, brand_id) VALUES
    ('MK4', prusa_id),
    ('MK3S+', prusa_id),
    ('XL', prusa_id),
    ('X1C', bambu_id),
    ('P1S', bambu_id),
    ('A1 Mini', bambu_id),
    ('Ender 3 V3', creality_id),
    ('Ender 5 S1', creality_id),
    ('Photon Mono 4K', anycubic_id)
  ON CONFLICT (brand_id, name) DO NOTHING;
END $$;
