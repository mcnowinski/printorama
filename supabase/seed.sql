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
-- DROPDOWN OPTIONS: Accepted File Types
-- ============================================================
INSERT INTO dropdown_options (category, label, sort_order) VALUES
  ('ACCEPTED_FILE_TYPE', 'stl', 1),
  ('ACCEPTED_FILE_TYPE', 'gcode', 2),
  ('ACCEPTED_FILE_TYPE', '3mf', 3),
  ('ACCEPTED_FILE_TYPE', 'obj', 4)
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

-- (Printer Locations removed — location is now free-text on the printer form)
-- (Printer Brands and Models removed — brand/model are now free-text on the printer form)
