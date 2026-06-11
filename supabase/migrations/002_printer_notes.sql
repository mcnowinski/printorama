-- Add notes field and update printer model
ALTER TABLE printers ADD COLUMN IF NOT EXISTS notes TEXT NOT NULL DEFAULT '';
