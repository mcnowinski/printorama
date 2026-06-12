-- Add free-text brand and model columns to printers
-- (replacing legacy FK columns brand_id and model_id)
ALTER TABLE printers ADD COLUMN IF NOT EXISTS brand TEXT NOT NULL DEFAULT '';
ALTER TABLE printers ADD COLUMN IF NOT EXISTS model TEXT NOT NULL DEFAULT '';
