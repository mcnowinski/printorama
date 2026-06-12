-- Make legacy FK columns nullable since printers now use
-- free-text brand and model fields instead
ALTER TABLE printers ALTER COLUMN brand_id DROP NOT NULL;
ALTER TABLE printers ALTER COLUMN model_id DROP NOT NULL;
