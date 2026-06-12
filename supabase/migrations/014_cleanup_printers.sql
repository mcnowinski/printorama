-- Clean up legacy columns and tables from the old brand/model FK design
-- Printers now use free-text brand and model fields

-- Drop FK constraints first
ALTER TABLE printers DROP CONSTRAINT IF EXISTS printers_brand_id_fkey;
ALTER TABLE printers DROP CONSTRAINT IF EXISTS printers_model_id_fkey;

-- Drop the legacy columns
ALTER TABLE printers DROP COLUMN IF EXISTS brand_id;
ALTER TABLE printers DROP COLUMN IF EXISTS model_id;

-- Drop the unused legacy tables
DROP TABLE IF EXISTS printer_models CASCADE;
DROP TABLE IF EXISTS printer_brands CASCADE;
