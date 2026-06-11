-- Make job title optional (form no longer requires it)
ALTER TABLE jobs ALTER COLUMN title SET DEFAULT '';
ALTER TABLE jobs ALTER COLUMN title DROP NOT NULL;
