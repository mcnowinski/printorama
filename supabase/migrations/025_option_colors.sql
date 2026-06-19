-- Add badge color to dropdown options
ALTER TABLE dropdown_options ADD COLUMN IF NOT EXISTS color TEXT NOT NULL DEFAULT 'secondary';

-- Seed default colors for job statuses
UPDATE dropdown_options SET color = 'secondary' WHERE category = 'JOB_STATUS' AND label = 'RECEIVED';
UPDATE dropdown_options SET color = 'warning' WHERE category = 'JOB_STATUS' AND label = 'PENDING';
UPDATE dropdown_options SET color = 'info' WHERE category = 'JOB_STATUS' AND label = 'FABRICATING';
UPDATE dropdown_options SET color = 'success' WHERE category = 'JOB_STATUS' AND label = 'COMPLETE';
UPDATE dropdown_options SET color = 'destructive' WHERE category = 'JOB_STATUS' AND label = 'FAILED';
UPDATE dropdown_options SET color = 'default' WHERE category = 'JOB_STATUS' AND label = 'CANCELLED';

-- Seed default colors for job types
UPDATE dropdown_options SET color = 'info' WHERE category = 'JOB_TYPE' AND label = '3D Printing';
UPDATE dropdown_options SET color = 'warning' WHERE category = 'JOB_TYPE' AND label = 'Laser Cut';
UPDATE dropdown_options SET color = 'destructive' WHERE category = 'JOB_TYPE' AND label = 'CNC';
UPDATE dropdown_options SET color = 'secondary' WHERE category = 'JOB_TYPE' AND label = 'Vinyl Cut';
